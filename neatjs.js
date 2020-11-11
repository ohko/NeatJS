function Neat() {

    function Genome({ population }) {

        return {
            population: population,
            nodes: {},
            connections: [],
            nextNodeID: 0,
            fitness: 0,
            maxNode: 0,
            init() {
                this.maxNode = this.population.inputNumber + this.population.outputNumber + this.population.inputNumber * 5
                for (let i = 0; i < this.population.inputNumber; i++) {
                    this.nodes[this.nextNodeID] = { index: this.nextNodeID, type: "input", value: 0 };
                    this.nextNodeID++
                }
                for (let o = 0; o < this.population.outputNumber; o++) {
                    this.nodes[this.nextNodeID] = { index: this.nextNodeID, type: "output", value: 0 };

                    for (let i = 0; i < this.population.inputNumber; i++) {
                        this.connections.push({ from: this.nodes[i].index, to: this.nextNodeID, weight: neatRandom(-1, 1), enabled: true, innovation: this.population.nextInnovationID++ })
                    }
                    this.nextNodeID++
                }
            },

            nextGeneration() {
                this.mutateWeight()
                if (Math.random() < 0.1) this.addNode()
                if (Math.random() < 0.2) this.addConnection()
            },

            mutateWeight() {
                for (let i = 0; i < this.connections.length; i++) {
                    if (Math.random() < 0.001) {
                        this.connections[i].weight = neatRandom(-1, 1)
                    } else if (Math.random() < 0.2) {
                        this.connections[i].weight += this.connections[i].weight * (Math.random() - 0.5) / 10
                    }
                }
            },
            crossover(b) {
                this.connections.map(f => {
                    let c = b.connections.filter(t => t.innovation == f.innovation)
                    if (c.length > 0) {
                        this.enabled = true
                        if (!this.enabled || !c.enabled) {
                            if (Math.random() < 0.75) this.enabled = false
                        } else if (Math.random() < 0.001) this.enabled = false
                        if (Math.random() < 0.5) this.weight = c.weight
                    }
                })
                return this
            },
            addConnection() {
                let from = Object.keys(this.nodes)
                let to = Object.keys(this.nodes)
                let found = false
                from.map(f => {
                    if (found || this.nodes[f].type == "output") return
                    to.map(t => {
                        if (found || f == t || this.nodes[t].type == "input") return
                        if (this.connections.some(c => (c.from == f && c.to == t) || (c.from == t && c.to == f))) return

                        found = true
                        this.connections.push({ from: f < t ? f : t, to: f < t ? t : f, weight: neatRandom(-1, 1), enabled: true, innovation: this.population.nextInnovationID++ })
                    })
                })
            },
            addNode() {
                if (this.nextNodeID > this.maxNode) return
                for (let index in this.nodes) {
                    if (this.nodes[index].type == "input") continue

                    let n = { index: this.nextNodeID++, type: "hidden", value: 0 }
                    this.nodes[n.index] = n

                    let c = this.connections[random(0, this.connections.length - 1)]
                    c.enabled = false
                    this.connections.push({ from: c.from, to: n.index, weight: neatRandom(-1, 1), enabled: true, innovation: this.population.nextInnovationID++ })
                    this.connections.push({ from: n.index, to: c.to, weight: neatRandom(-1, 1), enabled: true, innovation: this.population.nextInnovationID++ })
                    break
                }
            },

            toJSON() {
                let js = {
                    nodes: {},
                    connections: [],
                }
                for (let i in this.nodes) js.nodes[i] = { type: this.nodes[i].type }
                js.connections = [...this.connections.filter(c => c.enabled).map(x => { return { from: x.from, to: x.to, weight: x.weight, enabled: x.enabled, innovation: x.innovation } })]
                return js
            },
            clone() {
                let g = Genome({ population: this, inputNumber: this.population.inputNumber, outputNumber: this.population.outputNumber })
                g.loadJSON(this.toJSON())
                g.maxNode = this.maxNode
                return g
            },
            loadJSON(js) {
                for (let i in js.nodes) {
                    let n = { index: i, type: js.nodes[i].type, value: 0 }
                    this.nodes[i] = n
                    if (this.nextNodeID <= n.index) this.nextNodeID = parseInt(n.index) + 1
                }
                this.connections = [...js.connections.map(x => { return { from: x.from, to: x.to, weight: x.weight, enabled: x.enabled, innovation: x.innovation } })]
            }
        }
    }

    function random(min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min);
    }
    function neatRandom(min, max) {
        return min + Math.random() * (max - min);
    }

    return {
        Genome,
        Population({ inputNumber, outputNumber, genomeNumber, fitnessThreshold }) {
            if (genomeNumber < 6) genomeNumber = 6

            return {
                inputNumber: inputNumber,
                outputNumber: outputNumber,
                genomeNumber: genomeNumber,
                fitnessThreshold: fitnessThreshold,
                nextInnovationID: 0,

                async run(fitnessFunction, generations) {

                    this.genomes = []
                    for (let i = 0; i < this.genomeNumber; i++) {
                        let g = Genome({ population: this, inputNumber: this.inputNumber, outputNumber: this.outputNumber })
                        g.init()
                        this.genomes.push(g)
                    }

                    let winner, winnerFitness
                    if (generations <= 0) generations = Infinity
                    for (let n = 0; n < generations; n++) {
                        await fitnessFunction(this.genomes, n)
                        this.genomes.sort((a, b) => { return a.fitness > b.fitness ? -1 : 1 })

                        winner = this.genomes[0].toJSON()
                        winnerFitness = this.genomes[0].fitness
                        if (this.fitnessThreshold != undefined && this.genomes[0].fitness >= this.fitnessThreshold) break

                        for (let i = 0; i < this.genomeNumber; i++) {
                            let a, b
                            if (i < 2) { // 2
                                a = this.genomes[0].clone()
                                b = this.genomes[1].clone()
                            } else if (i < 4) { // 2
                                a = this.genomes[random(0, 1)].clone()
                                b = this.genomes[random(2, 3)].clone()
                            } else if (i < this.genomeNumber - 1) {
                                a = this.genomes[random(0, this.genomeNumber - 1)].clone()
                                b = this.genomes[random(0, this.genomeNumber - 1)].clone()
                            } else { // 1
                                a = Genome({ population: this, inputNumber: this.inputNumber, outputNumber: this.outputNumber })
                                a.init()
                                b = Genome({ population: this, inputNumber: this.inputNumber, outputNumber: this.outputNumber })
                                b.init()
                            }
                            this.genomes[i] = a.crossover(b)
                            this.genomes[i].nextGeneration()
                        }

                    }

                    let r = Genome({ population: this, inputNumber: this.inputNumber, outputNumber: this.outputNumber })
                    r.loadJSON(winner)
                    r.fitness = winnerFitness
                    return r
                }
            }
        },
        FeedForwardNetwork(genome) {
            return {
                genome: genome,

                sigmoid(x) {
                    return (1 / (1 + Math.exp(-x)));
                },

                activate(inputs) {
                    let outputs = []

                    for (let i = 0; i < inputs.length; i++) {
                        this.genome.nodes[i].value = inputs[i]
                    }

                    let connections = this.genome.connections
                    for (let n in this.genome.nodes) {
                        if (this.genome.nodes[n].type != "hidden") continue
                        this.genome.nodes[n].value = 0

                        connections.filter(c => c.to == this.genome.nodes[n].index && c.enabled).map(c => {
                            this.genome.nodes[n].value += this.genome.nodes[c.from].value * c.weight
                        })

                        this.genome.nodes[n].value = this.sigmoid(this.genome.nodes[n].value)
                    }
                    for (let n in this.genome.nodes) {
                        if (this.genome.nodes[n].type != "output") continue
                        this.genome.nodes[n].value = 0

                        connections.filter(c => c.to == n && c.enabled).map(c => {
                            this.genome.nodes[n].value += this.genome.nodes[c.from].value * c.weight
                        })
                        outputs.push(this.sigmoid(this.genome.nodes[n].value))
                    }

                    return outputs
                }
            }
        },
    }
}

if (typeof window == "undefined") {
    const data = [
        { inputs: [0, 0], outputs: [0] },
        { inputs: [0, 1], outputs: [1] },
        { inputs: [1, 0], outputs: [1] },
        { inputs: [1, 1], outputs: [0] },
    ]

    function fitnessFunction(genomes, generation) {
        genomes.forEach(genome => {
            genome.fitness = 4
            const ff = net.FeedForwardNetwork(genome)
            for (let i in data) {
                outputs = ff.activate(data[i].inputs)
                genome.fitness -= Math.pow(outputs[0] - data[i].outputs[0], 4)
            }
        })
        if (generation % 10 == 0) {
            genomes.sort((a, b) => { return a.fitness > b.fitness ? -1 : 1 })
            console.log("generation:", generation,
                "nodes:", Object.keys(genomes[0].nodes).length,
                "connections:", genomes[0].connections.length,
                "maxFitness:", genomes[0].fitness)
        }
    }

    const net = Neat()
    const pop = net.Population({ inputNumber: data[0].inputs.length, outputNumber: data[0].outputs.length, genomeNumber: 100, fitnessThreshold: 4 })
    let js

    (async _ => {
        { // run
            let winner = await pop.run(fitnessFunction, -1)
            js = winner.toJSON()
            // console.log(winner.toJSON())
            console.log("[winner] nodes:", Object.keys(js.nodes).length, "connects:", js.connections.length)
        }

        { // test
            let genome = net.Genome({ population: pop })
            genome.loadJSON(js)
            const ff = net.FeedForwardNetwork(genome)
            for (let i in data) {
                outputs = ff.activate(data[i].inputs)
                console.log(data[i].inputs, "=>", data[i].outputs, "~", outputs.map(x => x.toFixed(5)))
            }
        }
    })()
} else {
    const WALL = 0, PILL = 1, EMPTY = 2;
    // const map = [
    //     [0, 0, 0, 0, 0, 0, 0],
    //     [0, 2, 1, 1, 1, 1, 0],
    //     [0, 1, 0, 1, 0, 1, 0],
    //     [0, 1, 1, 1, 1, 1, 0],
    //     [0, 1, 0, 1, 0, 1, 0],
    //     [0, 1, 1, 1, 1, 1, 0],
    //     [0, 0, 0, 0, 0, 0, 0]
    // ]
    const map = [
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 2, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0],
        [0, 1, 0, 1, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 1, 0, 1, 0],
        [0, 1, 0, 0, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 1, 0],
        [0, 1, 1, 0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0, 1, 1, 0],
        [0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0],
        [0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0],
        [0, 0, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 0],
        [0, 0, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 0, 0],
        [0, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 0],
        [0, 1, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 1, 0],
        [0, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ]

    var PP = function () {
        this.init = _ => {
            this.x = 1
            this.y = 1
            this.alive = true
            this.win = false
            this.score = 0
            this.fitness = 0
            this.pillCount = 0
        }
        this.setMap = m => {
            this.map = [...m.map(x => [...x])]
            for (var y = 0; y < this.map.length; y++) {
                for (var x = 0; x < this.map[y].length; x++) {
                    if (this.map[y][x] == 1) this.pillCount++
                }
            }
        }
        this.update = _ => {
            if (this.map[this.y][this.x] == WALL || this.score < 0) {
                this.alive = false
                return
            } else if (this.map[this.y][this.x] == PILL) {
                this.score += 1
                this.fitness += 1
                this.map[this.y][this.x] = EMPTY
                this.pillCount--
            }
            if (this.pillCount == 0) {
                this.win = true
                return
            }
            this.score -= 0.1
        }
        this.getInputs = _ => {
            let near = map.length * map[0].length
            let nearX = 0, nearY = 0
            for (let y = 0; y < map.length; y++) {
                for (let x = 0; x < map[0].length; x++) {
                    if (this.map[y][x] != 1) continue
                    let dis = Math.sqrt(Math.pow(this.x - x, 2) + Math.pow(this.y - y, 2))
                    if (dis < near) {
                        near = dis
                        nearX = x
                        nearY = y
                    }
                }
            }

            var graph = new Graph(map);
            var start = graph.grid[this.y][this.x];
            var end = graph.grid[nearY][nearX];
            var result = astar.search(graph, start, end);
            if (result.length == 0) result = [{ x: this.x, y: this.y, m: 1 }]
            let quick = result[0]

            let inputs = [0, 0, 0, 0, 0, 0]
            if (quick.y < this.x) inputs[0] = 1
            else if (quick.y > this.x) inputs[2] = 1
            else inputs[1] = 1
            if (quick.x < this.y) inputs[3] = 1
            else if (quick.x > this.y) inputs[5] = 1
            else inputs[4] = 1

            // console.log([this.x, this.y], [nearX, nearY], JSON.stringify(result), inputs)
            return inputs
        }
        this.move = outputs => {
            if (outputs[0] > 0.5) {
                if (outputs[1] > 0.5) this.y--
                else this.y++
            } else {
                if (outputs[1] > 0.5) this.x--
                else this.x++
            }
        }
        this.getMap = _ => {
            var html = []
            for (var y = 0; y < this.map.length; y++) {
                var tmp = ""
                for (var x = 0; x < this.map[y].length; x++) {
                    if (x == this.x && y == this.y) tmp += "O"
                    else if (this.map[y][x] == 2) tmp += " "
                    else if (this.map[y][x] == 0) tmp += "X"
                    else tmp += "."
                }
                html.push(tmp)
            }
            return html.join("\n")
        }
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async function fitnessFunction(genomes, generation) {
        let inputs, maxScore = 0
        for (let i = 0; i < genomes.length; i++) {
            let genome = genomes[i]
            let p = new PP()
            p.init()
            p.setMap(map)

            const ff = net.FeedForwardNetwork(genome)
            while (p.alive) {
                inputs = p.getInputs()
                outputs = ff.activate(inputs)
                p.move(outputs)
                p.update()
                if (maxScore == 0 || p.fitness > maxScore) maxScore = p.fitness
                if (typeof window != "undefined") document.getElementById("preview").innerHTML = p.getMap()
                else console.log("\033c" + p.getMap())
                if (p.win) {
                    genome.fitness = Infinity
                    i = genomes.length
                    break
                }
                await sleep(1)
            }
            genome.fitness = p.fitness
        }
        console.log("generation:", generation,
            "nodes:", Object.keys(genomes[0].nodes).length,
            "connections:", genomes[0].connections.length,
            "maxScore:", maxScore)
    }

    const p = new PP()
    p.init()
    p.setMap(map)
    const net = Neat()
    const pop = net.Population({ inputNumber: 6, outputNumber: 2, genomeNumber: 10, fitnessThreshold: p.pillCount })
    let js

    (async _ => {
        {// run
            let winner = await pop.run(fitnessFunction, -1)
            js = winner.toJSON(); window.js = winner.toJSON()
            console.log(winner.toJSON())
            console.log("[winner] nodes:", Object.keys(js.nodes).length, "connects:", js.connections.length)
        }

        { // test
            let genome = net.Genome({ population: pop })
            genome.loadJSON(JSON.parse('{"nodes":{"0":{"type":"input"},"1":{"type":"input"},"2":{"type":"input"},"3":{"type":"input"},"4":{"type":"input"},"5":{"type":"input"},"6":{"type":"output"},"7":{"type":"output"}},"connections":[{"from":0,"to":6,"weight":-0.948720954783036,"enabled":true,"innovation":1361},{"from":1,"to":6,"weight":0.6514481670555474,"enabled":true,"innovation":1362},{"from":2,"to":6,"weight":-0.3476279913941305,"enabled":true,"innovation":1363},{"from":3,"to":6,"weight":0.9144340771562166,"enabled":true,"innovation":1364},{"from":4,"to":6,"weight":-0.8996647149561015,"enabled":true,"innovation":1365},{"from":5,"to":6,"weight":-0.3247419203711557,"enabled":true,"innovation":1366},{"from":0,"to":7,"weight":0.9041649485100445,"enabled":true,"innovation":1367},{"from":1,"to":7,"weight":-0.1246774588954982,"enabled":true,"innovation":1368},{"from":2,"to":7,"weight":-0.8526145057513461,"enabled":true,"innovation":1369},{"from":3,"to":7,"weight":0.2071473255379922,"enabled":true,"innovation":1370},{"from":4,"to":7,"weight":0.47735457706527296,"enabled":true,"innovation":1371},{"from":5,"to":7,"weight":-0.7293140830085756,"enabled":true,"innovation":1372}]}'))
            await fitnessFunction([genome], 0)
        }
    })()
}