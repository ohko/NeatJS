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
                    this.nodes[this.nextNodeID] = { index: this.nextNodeID, type: "input", value: Math.random() };
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

            nextGeneration(n) {
                this.mutateWeight(n)
                if (Math.random() < (n + 1) / 10 * 0.2) this.addNode()
                if (Math.random() < (n + 1) / 10 * 0.2) this.addConnection()
            },

            mutateWeight(n) {
                for (let i = 0; i < this.connections.length; i++) {
                    if (Math.random() < 0.001) {
                        this.connections[i].weight = neatRandom(-1, 1)
                    } else if (Math.random() < (n + 1) / 10 * 0.2) {
                        this.connections[i].weight += neatRandom(-1, 1) * (n + 1)
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
                    fitness: 0,
                }
                for (let i in this.nodes) js.nodes[i] = { type: this.nodes[i].type }
                js.connections = [...this.connections.filter(c => c.enabled).map(x => { return { from: x.from, to: x.to, weight: x.weight, enabled: x.enabled, innovation: x.innovation } })]
                js.fitness = this.fitness
                return js
            },
            clone() {
                let g = Genome({ population: this.population, inputNumber: this.population.inputNumber, outputNumber: this.population.outputNumber })
                g.loadJSON(this.toJSON())
                g.fitness = this.fitness
                return g
            },
            loadJSON(js) {
                this.fitness = js.fitness
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
            if (genomeNumber < 5) genomeNumber = 5

            return {
                inputNumber: inputNumber + 1,
                outputNumber: outputNumber,
                genomeNumber: genomeNumber,
                fitnessThreshold: fitnessThreshold,
                nextInnovationID: 0,
                winners: [],

                async run(fitnessFunction, generations) {

                    this.genomes = this.create()

                    if (generations <= 0) generations = Infinity
                    for (let n = 0; n < generations; n++) {
                        await fitnessFunction(this.genomes, n, this)

                        this.getWinners(1)
                        if (n + 1 == generations) break
                        if (this.fitnessThreshold != undefined && this.winners[0].fitness >= this.fitnessThreshold) break
                        this.next()
                    }

                    return this.winners[0]
                },

                create() {
                    this.genomes = []
                    for (let i = 0; i < this.genomeNumber; i++) {
                        let g = Genome({ population: this, inputNumber: this.inputNumber, outputNumber: this.outputNumber })
                        g.init()
                        this.genomes.push(g)
                    }
                    return this.genomes
                },

                getWinners(n) {
                    const mysort = (a, b) => {
                        if (a.fitness == b.fitness) {
                            if (a.nextNodeID == b.nextNodeID) {
                                if (a.connections.length == b.connections.length) return Math.random() - Math.random()
                                return a.connections.length - b.connections.length
                            }
                            return a.nextNodeID - b.nextNodeID
                        }
                        return b.fitness - a.fitness
                    }
                    if (this.winners.length > n) this.winners.splice(n)
                    this.genomes.sort(mysort)
                    for (let i = 0; i < 4; i++)  this.winners.push(this.genomes[i].clone())
                    this.winners.sort(mysort)
                    this.winners.splice(4)
                    return this.winners
                },

                next() {
                    for (let i = 0; i < this.genomeNumber; i++) {
                        let a, b
                        if (i < 4) {
                            a = this.winners[0].clone()
                            b = this.winners[1].clone()
                            this.genomes[i] = a.crossover(b)
                        } else if (i < this.genomeNumber - 2) {
                            a = this.winners[random(0, 3)].clone()
                            b = this.winners[random(0, 3)].clone()
                            this.genomes[i] = a.crossover(b)
                        } else {
                            this.genomes[i] = this.winners[random(0, 3)].clone()
                        }
                        this.genomes[i].nextGeneration(i)
                    }
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
        sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)) }
    }
}

if (typeof exports != "undefined") exports.Neat = Neat