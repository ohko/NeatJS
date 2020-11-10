function Neat() {

    function Genome({ population }) {

        return {
            population: population,
            nodes: {},
            connections: [],
            nextNodeID: 0,
            fitness: 0,
            init() {
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
                if (Math.random() < 0.02) this.addNode()
                if (Math.random() < 0.1) this.addConnection()
            },

            mutateWeight() {
                for (let i = 0; i < this.connections.length; i++) {
                    if (!this.connections[i].enabled) continue

                    if (Math.random() < 0.01) {
                        this.connections[i].weight = neatRandom(-1, 1)
                    } else {
                        this.connections[i].weight += this.connections[i].weight * (Math.random() - 0.5) * 3 + (Math.random() - 0.5)
                    }
                }
            },
            crossover(b) {
                this.connections.map(f => {
                    let c = b.connections.filter(t => t.innovation == f.innovation)
                    if (c.length > 0) {
                        this.enabled = true
                        if ((!this.enabled || !c.enabled) && Math.random() < 0.75) {
                            this.enabled = false
                        }
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

            return {
                inputNumber: inputNumber,
                outputNumber: outputNumber,
                genomeNumber: genomeNumber,
                fitnessThreshold: fitnessThreshold,
                nextInnovationID: 0,

                run(fitnessFunction, generations) {

                    this.genomes = []
                    for (let i = 0; i < this.genomeNumber; i++) {
                        let g = Genome({ population: this, inputNumber: this.inputNumber, outputNumber: this.outputNumber })
                        g.init()
                        this.genomes.push(g)
                    }

                    let winner, winnerFitness
                    if (generations <= 0) generations = Infinity
                    for (let n = 0; n < generations; n++) {
                        fitnessFunction(this.genomes, n)
                        this.genomes.sort((a, b) => { return a.fitness > b.fitness ? -1 : 1 })

                        winner = this.genomes[0].toJSON()
                        winnerFitness = this.genomes[0].fitness
                        if (this.fitnessThreshold != undefined && this.genomes[0].fitness >= this.fitnessThreshold) break

                        for (let i = 0; i < this.genomeNumber; i++) {
                            let a, b
                            if (i < 2) {
                                a = this.genomes[0].clone()
                                b = this.genomes[1].clone()
                            } else if (i < this.genomeNumber - 2) {
                                a = this.genomes[random(0, 3)].clone()
                                b = this.genomes[random(0, 3)].clone()
                            } else {
                                a = this.genomes[random(0, this.genomeNumber - 1)].clone()
                                b = this.genomes[random(0, this.genomeNumber - 1)].clone()
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
                        this.genome.nodes[n].value = this.sigmoid(this.genome.nodes[n].value)
                    }

                    for (let i in this.genome.nodes) {
                        if (this.genome.nodes[i].type != "output") continue

                        outputs.push(this.genome.nodes[i].value)
                    }

                    return outputs
                }
            }
        },
    }
}

const xor = [
    { inputs: [0, 0], outputs: [0] },
    { inputs: [0, 1], outputs: [1] },
    { inputs: [1, 0], outputs: [1] },
    { inputs: [1, 1], outputs: [0] },
]

function fitnessFunction(genomes, generation) {
    if (generation % 100 == 0) {
        console.log("generation:", generation, "nodes:", Object.keys(genomes[0].nodes).length, "connections:", genomes[0].connections.length)
    }
    genomes.forEach(genome => {
        genome.fitness = 0
        let score = 0
        const ff = net.FeedForwardNetwork(genome)
        for (let i in xor) {
            outputs = ff.activate(xor[i].inputs)
            let diff = Math.pow(outputs[0] - xor[i].outputs[0], 2)
            if (diff < Math.pow(0.01, 2)) score++
        }
        genome.fitness = score
    })
}

const net = Neat()
const pop = net.Population({ inputNumber: 2, outputNumber: 1, genomeNumber: 100, fitnessThreshold: 4 })
let js

{ // run
    let winner = pop.run(fitnessFunction, -1)
    js = winner.toJSON()
    // console.log(winner.toJSON())
    console.log("[winner] nodes:", Object.keys(js.nodes).length, "connects:", js.connections.length)
}

{ // test
    let genome = net.Genome({ population: pop })
    genome.loadJSON(js)
    const ff = net.FeedForwardNetwork(genome)
    for (let i in xor) {
        outputs = ff.activate(xor[i].inputs)
        console.log(xor[i].inputs, "=>", xor[i].outputs, "~", outputs.map(x => x.toFixed(5)))
    }
}