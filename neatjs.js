
const activateFunc = {
    LOGISTIC: x => 1 / (1 + Math.exp(-x)),
    TANH: x => Math.tanh(x),
    IDENTITY: x => x,
    STEP: x => x > 0 ? 1 : 0,
    RELU: x => x > 0 ? x : 0,
    SOFTSIGN: x => x / (1 + Math.abs(x)),
    SINUSOID: x => Math.sin(x),
    GAUSSIAN: x => Math.exp(-Math.pow(x, 2)),
    BENT_IDENTITY: x => (Math.sqrt(Math.pow(x, 2) + 1) - 1) / 2 + x,
    BIPOLAR: x => x > 0 ? 1 : -1,
    BIPOLAR_SIGMOID: x => 2 / (1 + Math.exp(-x)) - 1,
    HARD_TANH: x => Math.max(-1, Math.min(1, x)),
    ABSOLUTE: x => Math.abs(x),
    INVERSE: x => 1 - x,
    SELU: x => {
        var alpha = 1.6732632423543772848170429916717;
        var scale = 1.0507009873554804934193349852946;
        var fx = x > 0 ? x : alpha * Math.exp(x) - alpha;
        return fx * scale;
    },
}

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
                    this.nodes[this.nextNodeID++] = { type: "input", value: Math.random() };
                }
                for (let o = 0; o < this.population.outputNumber; o++) {
                    this.nodes[this.nextNodeID] = { type: "output", value: 0, activate: "LOGISTIC" };

                    if (this.population.options.AllConnection) {
                        for (let i = 0; i < this.population.inputNumber; i++) {
                            this.connections.push({ from: i, to: this.nextNodeID, weight: neatRandom(-1, 1), enabled: true, innovation: this.population.nextInnovationID++ })
                        }
                    } else {
                        this.connections.push({ from: random(0, this.population.inputNumber - 1), to: this.nextNodeID, weight: neatRandom(-1, 1), enabled: true, innovation: this.population.nextInnovationID++ })
                    }
                    this.nextNodeID++
                }
                for (let h = 0; h < this.population.hiddenNumber; h++) {
                    this.addNode()
                }
            },

            nextGeneration(n, dis) {
                this.mutateWeight(n, dis)
                if (dis < this.population.options.MaxDistance) return

                let div = Math.max(1, this.population.options.AddNode + this.population.options.AddConnection)
                let r = Math.random()
                let r1 = this.population.options.AddNode
                let r2 = this.population.options.AddConnection
                if (r < r1 / div) this.addNode()
                else if (r < (r1 + r2) / div) this.addConnection()
            },

            mutateWeight(n, dis) {
                let r
                for (let i = 0; i < this.connections.length; i++) {
                    r = Math.random()
                    if (r < 0.02) {
                        this.connections[i].weight = neatRandom(-1, 1)
                    } else if (r < this.population.options.MutateWeight) {
                        this.connections[i].weight += neatRandom(-1, 1) * Math.min(n + 1, 10)
                    }
                }
            },
            crossover(b) {
                this.connections.map(f => {
                    let c = b.connections.filter(t => t.innovation == f.innovation)
                    if (c.length > 0) {
                        this.enabled = true
                        c.enabled = true
                        if (!this.enabled || !c.enabled) {
                            if (Math.random() < 0.75) {
                                this.enabled = false
                                c.enabled = false
                            }
                        }
                        if (Math.random() < 0.5) {
                            let x = c.weight
                            c.weight = this.weight
                            this.weight = x
                        }
                    }
                })
                return this
            },
            addConnection() {
                let fs = Object.keys(this.nodes)
                let ts = Object.keys(this.nodes)
                fs.sort(_ => { return Math.random() - 0.5 })
                ts.sort(_ => { return Math.random() - 0.5 })

                for (let a = 0; a < fs.length; a++) {
                    let f = fs[a]
                    if (this.nodes[f].type == "output") continue

                    for (let b = 0; b < ts.length; b++) {
                        let t = ts[b]
                        if (this.nodes[t].type != "hidden" || t <= f) continue
                        if (this.connections.some(c => c.from == f && c.to == t)) continue

                        this.connections.push({ from: f, to: t, weight: neatRandom(-1, 1), enabled: true, innovation: this.population.nextInnovationID++ })
                        return
                    }
                }
            },
            addNode() {
                let outs = []
                for (let i = 0; i < this.connections.length; i++) {
                    if (this.nodes[this.connections[i].to].type == "output") outs.push(this.connections[i])
                }

                const as = Object.keys(activateFunc)
                this.nodes[this.nextNodeID] = { type: "hidden", value: 0, activate: as[0, random(0, as.length - 1)] }

                let c = outs[random(0, outs.length - 1)]
                c.enabled = false
                this.connections.push({ from: c.from, to: this.nextNodeID, weight: neatRandom(-1, 1), enabled: true, innovation: this.population.nextInnovationID++ })
                this.connections.push({ from: this.nextNodeID, to: c.to, weight: neatRandom(-1, 1), enabled: true, innovation: this.population.nextInnovationID++ })
                this.nextNodeID++
            },
            toJSON() {
                let js = {
                    nodes: {},
                    connections: [],
                    nextNodeID: 0,
                    fitness: 0,
                }
                for (let i in this.nodes) {
                    js.nodes[i] = { type: this.nodes[i].type, activate: this.nodes[i].activate }
                }
                js.connections = [...this.connections.map(x => { return { from: x.from, to: x.to, weight: x.weight, enabled: x.enabled, innovation: x.innovation } })]
                js.nextNodeID = this.nextNodeID
                js.fitness = this.fitness
                return js
            },
            clone() {
                let g = Genome({ population: this.population })
                g.loadJSON(this.toJSON())
                g.fitness = this.fitness
                return g
            },
            loadJSON(js) {
                this.fitness = js.fitness
                for (let i in js.nodes) this.nodes[i] = { type: js.nodes[i].type, value: 0, activate: js.nodes[i].activate }
                this.nextNodeID = js.nextNodeID
                this.connections = [...js.connections.map(x => { return { from: x.from, to: x.to, weight: x.weight, enabled: x.enabled, innovation: x.innovation } })]
            },
            getActiveNodeNumber() {
                let nn = 0
                for (let i in this.nodes) {
                    nn++
                }
                return nn
            },
            getActiveConnectionsNumber() {
                let cn = 0
                for (let i in this.connections) {
                    if (this.connections[i].enabled) cn++
                }
                return cn
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
        Population({ inputNumber, hiddenNumber, outputNumber, genomeNumber, fitnessThreshold, options }) {
            if (genomeNumber < 5) genomeNumber = 5
            if (!options) options = {
                KeepWinner: 0,
                AddNode: 0.2,
                AddConnection: 0.2,
                MutateWeight: 0.2,
                MaxDistance: 2,
                AllConnection: true
            }

            return {
                options: options,
                inputNumber: inputNumber,
                hiddenNumber: hiddenNumber,
                outputNumber: outputNumber,
                genomeNumber: genomeNumber,
                fitnessThreshold: fitnessThreshold,
                nextInnovationID: 0,
                winners: [],

                async run(fitnessFunction, generations) {

                    this.genomes = this.create()
                    if (generations <= 0) generations = Infinity

                    let dis = 0, last = 0.0, keep = 0
                    for (let n = 0; n < generations; n++) {
                        await fitnessFunction(this.genomes, n, this)

                        this.getWinners(keep)
                        if (n + 1 == generations) break
                        if (this.fitnessThreshold != undefined && this.winners[0].fitness >= this.fitnessThreshold) break

                        if (last < this.winners[0].fitness) {
                            keep = this.options.KeepWinner
                            dis = 0
                        } else dis++
                        if (dis > this.options.MaxDistance) keep = 0
                        last = this.winners[0].fitness

                        this.next(dis)
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
                            let aid = a.getActiveNodeNumber(), bid = b.getActiveNodeNumber()
                            if (aid == bid) {
                                let c1 = a.getActiveConnectionsNumber(), c2 = b.getActiveConnectionsNumber()
                                if (c1 == c2) return Math.random() < 0.5
                                return c1 - c2
                            }
                            return aid - bid
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

                next(dis) {
                    // let sum = 0
                    // for (let i = 0; i < this.genomes.length; i++) {
                    //     sum += Math.pow(this.fitnessThreshold - this.genomes[i].fitness, 2)
                    // }
                    // let stdev = Math.sqrt(sum / this.genomes.length)
                    // let minStdev = stdev / this.fitnessThreshold

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
                        this.genomes[i].nextGeneration(i, dis)
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

                        connections.filter(c => c.to == n && c.enabled).map(c => {
                            if (this.genome.nodes[c.from] == undefined) return
                            this.genome.nodes[n].value += this.genome.nodes[c.from].value * c.weight
                        })

                        // this.genome.nodes[n].value = this.sigmoid(this.genome.nodes[n].value)
                        this.genome.nodes[n].value = activateFunc[this.genome.nodes[n].activate](this.genome.nodes[n].value)
                    }
                    for (let n in this.genome.nodes) {
                        if (this.genome.nodes[n].type != "output") continue
                        this.genome.nodes[n].value = 0

                        connections.filter(c => c.to == n && c.enabled).map(c => {
                            if (this.genome.nodes[c.from] == undefined) return
                            this.genome.nodes[n].value += this.genome.nodes[c.from].value * c.weight
                        })
                        // outputs.push(this.sigmoid(this.genome.nodes[n].value))
                        outputs.push(activateFunc[this.genome.nodes[n].activate](this.genome.nodes[n].value))
                    }

                    return outputs
                }
            }
        },
        sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)) }
    }
}

if (typeof exports != "undefined") exports.Neat = Neat