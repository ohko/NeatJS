function Neat({ inputNumber, outputNumber, genomeNumber, fitnessThreshold }) {

    class Population {

        constructor({ inputNumber, outputNumber, genomeNumber, fitnessThreshold }) {
            this.inputNumber = inputNumber
            this.outputNumber = outputNumber
            this.genomeNumber = genomeNumber
            this.fitnessThreshold = fitnessThreshold
            this.nextInnovationID = 0
        }

        run(fitnessFunction, generations) {
            this.fitnessFunction = fitnessFunction

            this.genomes = []
            for (let i = 0; i < this.genomeNumber; i++) this.genomes.push(new Genome(this, this.inputNumber, this.outputNumber))

            let winner, winnerFitness
            if (generations <= 0) generations = Infinity
            for (let n = 0; n < generations; n++) {
                this.fitnessFunction(this.genomes)
                this.genomes.sort((a, b) => { return a.fitness > b.fitness ? -1 : 1 })

                winner = this.genomes[0].toJSON()
                winnerFitness = this.genomes[0].fitness
                if (this.genomes[0].fitness >= this.fitnessThreshold) break

                if (n % 100 == 0) {
                    console.log("gen:", n, "nodes:", Object.keys(this.genomes[0].nodes).length, "connects:", this.genomes[0].connections.length)
                }

                for (let i = 4; i < this.genomeNumber; i++) {
                    let a = new Genome(this, this.inputNumber, this.outputNumber)
                    let b = new Genome(this, this.inputNumber, this.outputNumber)
                    a.loadJSON(this.genomes[random(0, 3)].toJSON())
                    b.loadJSON(this.genomes[random(0, 3)].toJSON())
                    this.genomes[i] = a.crossover(b)
                }

                this.nextGen()
            }

            let r = new Genome(this, this.inputNumber, this.outputNumber)
            r.loadJSON(winner)
            r.fitness = winnerFitness
            return r
        }

        nextGen() {
            for (let i = 0; i < this.genomeNumber; i++) this.genomes[i].nextGen()
        }

    }

    class Genome {
        constructor(population, inputNumber, outputNumber) {
            this.population = population
            this.inputNumber = inputNumber
            this.outputNumber = outputNumber
            this.connections = []
            this.nodes = {}
            this.nextNodeID = 0
            this.fitness = 0

            for (let i = 0; i < inputNumber; i++) {
                let n = new Node(this.nextNodeID++, "input")
                this.nodes[n.index] = n
            }
            for (let o = 0; o < outputNumber; o++) {
                let n = new Node(this.nextNodeID++, "output")
                this.nodes[n.index] = n

                for (let i = 0; i < inputNumber; i++) {
                    this.connections.push(new Connection({ from: this.nodes[i].index, to: n.index, weight: neatRandom(-1, 1), enabled: true, innovation: this.population.nextInnovationID++ }))
                }
            }
        }

        nextGen() {
            if (Math.random() < 0.8) this.mutateWeight()
            if (Math.random() < 0.5) this.addConnection()
            if (Math.random() < 0.2) this.addNode()
        }

        mutateWeight() {
            for (let i = 0; i < this.connections.length; i++) {
                if (Math.random() < 0.1) {
                    this.connections[i].weight = neatRandom(-1, 1)
                } else {
                    this.connections[i].weight += this.connections[i].weight * (Math.random() - 0.5) * 3 + (Math.random() - 0.5)
                }
            }
        }
        crossover(b) {
            this.connections.map(f => {
                let c = b.connections.filter(t => t.innovation == f.innovation)
                if (c.length > 0) {
                    if ((!this.enabled || !c.enabled) && Math.random() < 0.75) {
                        this.enabled = false
                    } else {
                        this.enabled = true
                    }
                }
            })
            return this
        }
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
                    this.connections.push(new Connection({ from: f < t ? f : t, to: f < t ? t : f, weight: neatRandom(-1, 1), enabled: true, innovation: this.population.nextInnovationID++ }))
                })
            })
        }
        addNode() {
            for (let index in this.nodes) {
                if (this.nodes[index].type == "input") continue

                let n = new Node(this.nextNodeID++, "hidden")
                this.nodes[n.index] = n

                let c = this.connections[random(0, this.connections.length - 1)]
                c.enabled = false
                this.connections.push(new Connection({ from: c.from, to: n.index, weight: neatRandom(-1, 1), enabled: true, innovation: this.population.nextInnovationID++ }))
                this.connections.push(new Connection({ from: n.index, to: c.to, weight: neatRandom(-1, 1), enabled: true, innovation: this.population.nextInnovationID++ }))
                break
            }
        }

        toJSON() {
            let js = {
                nodes: {},
                connections: [],
            }
            for (let i in this.nodes) js.nodes[i] = { type: this.nodes[i].type }
            js.connections = [...this.connections.filter(c => c.enabled).map(x => { return { from: x.from, to: x.to, weight: x.weight, enabled: x.enabled, innovation: x.innovation } })]
            return js
        }
        clone() {
            let g = new Genome(this.population, this.inputNumber, this.outputNumber)
            g.nextNodeID = this.nextNodeID
            g.fitness = this.fitness
            for (let i in this.nodes) g.nodes[i] = { type: this.nodes[i].type }
            g.connections = [...this.connections.map(x => x.clone())]
            return g
        }
        loadJSON(js) {
            for (let i in js.nodes) {
                let n = new Node(i, js.nodes[i].type)
                this.nodes[i] = n
                if (this.nextNodeID <= n.index) this.nextNodeID = parseInt(n.index) + 1
            }
            this.connections = [...js.connections.map(x => new Connection(x))]
        }
    }

    class Connection {
        constructor({ from, to, weight, enabled, innovation }) {
            this.weight = weight
            this.from = from
            this.to = to
            this.innovation = innovation
            this.enabled = enabled
        }
        clone() {
            return new Connection({ from: this.from, to: this.to, weight: this.weight, enabled: this.enabled, innovation: this.innovation })
        }
    }

    class Node {
        constructor(index, type) {
            this.index = index
            this.type = type
            this.value = 0
        }
    }

    this.FeedForwardNetwork = genome => {
        this.genome = genome

        this.sigmoid = x => {
            return (1 / (1 + Math.exp(-x)));
        }

        this.activate = inputs => {
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

        return this
    }

    function random(min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min);
    }
    function neatRandom(min, max) {
        return min + Math.random() * (max - min);
    }

    return {
        pop: new Population({ inputNumber, outputNumber, genomeNumber, fitnessThreshold }),
        FeedForwardNetwork: this.FeedForwardNetwork,
    }
}

const xor = [
    { inputs: [0, 0], outputs: [0] },
    { inputs: [0, 1], outputs: [1] },
    { inputs: [1, 0], outputs: [1] },
    { inputs: [1, 1], outputs: [0] },
]

const net = Neat({ inputNumber: 2, outputNumber: 1, genomeNumber: 50, fitnessThreshold: 4 })

let count = 0
function fitnessFunction(genomes) {
    // console.log("gen:", count++)
    genomes.forEach((genome, genomeID) => {
        genome.fitness = 0
        let score = 0
        const ff = net.FeedForwardNetwork(genome)
        for (let i in xor) {
            outputs = ff.activate(xor[i].inputs)
            let diff = Math.pow(outputs[0] - xor[i].outputs[0], 2)
            if (diff < Math.pow(0.1, 2)) score++
        }
        genome.fitness = score
    })
}

let winner = net.pop.run(fitnessFunction, -1)
let js = winner.toJSON()
// console.log(winner.toJSON())
console.log("nodes:", Object.keys(js.nodes).length, "connects:", js.connections.length)
console.log("winner.fitness:", winner.fitness)

