// const fitness_threshold = 4

class Population {

    constructor(inputCount, outputCount, genomeCount) {
        this.inputCount = inputCount
        this.outputCount = outputCount
        this.genomeCount = genomeCount
    }

    run(fitnessFunction, generations) {
        this.fitnessFunction = fitnessFunction

        this.genomes = []
        for (let i = 0; i < this.genomeCount; i++) this.genomes.push(new Genome(this))

        for (let n = 0; n < generations; n++) {
            this.fitnessFunction(this.genomes)
            this.genomes.sort((a, b) => { return a.fitness > b.fitness ? -1 : 1 })
            console.log(n, this.genomes[0].fitness)


            for (let i = 4; i < this.genomes.length; i++) {
                let index = random(0, 3)
                this.genomes[i].nodes = {}
                this.genomes[i].connections = {}
                for (let j in this.genomes[index].nodes) {
                    let n = new Node(this.genomes[i], this.genomes[index].nodes[j].type)
                    n.index = this.genomes[index].nodes[j].index
                    n.generation = this.genomes[index].nodes[j].generation + 1
                    this.genomes[i].nodes[j] = n
                }
                for (let j in this.genomes[index].connections) {
                    this.genomes[i].connections[j] = []
                    for (let k = 0; k < this.genomes[index].connections[j].length; k++) {
                        this.genomes[i].connections[j].push({ index: this.genomes[index].connections[j][k].index, weight: this.genomes[index].connections[j][k].weight })
                    }
                }
            }

            this.nextGen()
        }

        return this.genomes[0]
    }

    nextGen() {
        for (let i = 0; i < this.genomeCount; i++) this.genomes[i].nextGen()
    }

}

class Genome {
    constructor(population) {
        this.population = population
        this.connections = {} // {to: [{index:from,weigth:x}]}
        this.nodes = {}
        this.nodeID = 0
        this.fitness = 0
        this.generation = 0

        for (let i = 0; i < this.population.inputCount; i++) {
            let n = new Node(this, "input")
            this.nodes[n.index] = n
        }
        for (let i = 0; i < this.population.outputCount; i++) {
            let n = new Node(this, "output")
            this.nodes[n.index] = n
            if (!this.connections[n.index]) this.connections[n.index] = []
            for (let j = 0; j < this.population.inputCount; j++) {
                this.connections[n.index].push({ index: this.nodes[j].index, weight: Math.random() })
            }
        }
    }

    nextGen() {
        // ++this.generation

        for (let index in this.connections) {
            for (let i = 0; i < this.connections[index].length; i++) {
                if (Math.random() < 0.2) {
                    this.connections[index][i].weight += this.connections[index][i].weight * (Math.random() - 0.5) * 3 + (Math.random() - 0.5);
                }
            }
        }
        for (let index in this.nodes) {
            if (Math.random() < 0.02 && this.nodes[index].type != "input") {
                let n = new Node(this, "node")
                this.nodes[n.index] = n

                let r = this.connections[index].splice(0, 1)
                this.connections[index].push({ index: n.index, weight: Math.random() })
                this.connections[n.index] = [r[0]]
            }
        }
    }

    toJSON() {
        let js = {
            nodes: {},
            connections: {},
        }
        for (let i in this.nodes) js.nodes[i] = { type: this.nodes[i].type, generation: this.nodes[i].generation }
        for (let i in this.connections) js.connections[i] = this.connections[i]
        return js
    }
    loadJSON(js) {
        for (let i in js.nodes) {
            let n = new Node(this, js.nodes[i].type)
            n.index = i
            n.generation = js.nodes[i].generation
            if (this.nodeID <= n.index) this.nodeID = n.index + 1
            this.nodes[i] = n
        }
        for (let i in js.connections) {
            this.connections[i] = js.connections[i]
        }
    }
}

class Connection {
    constructor(from, to) {
        this.weight = Math.random()
        this.from = from
        this.to = to
    }
}

class Node {
    constructor(genome, type) {
        this.genome = genome
        this.index = genome.nodeID++
        this.value = 0
        this.type = type
        this.generation = this.genome.generation
    }
}

class FeedForwardNetwork {
    constructor(genome) {
        this.genome = genome
    }

    sigmoid(x) {
        return (1 / (1 + Math.exp(-x)));
    }

    activate(inputs) {
        let outputs = []

        // init
        for (let i in this.genome.nodes) {
            this.genome.nodes[i].value = null
            this.genome.nodes[i].tmp = []
        }
        for (let i = 0; i < inputs.length; i++) {
            this.genome.nodes[i].value = inputs[i]
        }

        let need = []
        for (var i in this.genome.connections) {
            for (var j = 0; j < this.genome.connections[i].length; j++) need.push([this.genome.connections[i][j].index, i, this.genome.connections[i][j].weight])
        }
        // console.log(need)
        let from, to, weight
        while (need.length > 0) {
            for (let i = 0; i < need.length; i++) {
                from = need[i][0]
                to = need[i][1]
                weight = need[i][2]
                if (this.genome.nodes[from].value != null) {
                    need.splice(i, 1)
                    this.genome.nodes[to].tmp.push(this.genome.nodes[from].value * weight)
                    if (this.genome.nodes[to].tmp.length == this.genome.connections[to].length) {
                        this.genome.nodes[to].value = 0
                        this.genome.nodes[to].tmp.map(x => { this.genome.nodes[to].value += x })
                        this.genome.nodes[to].value = this.sigmoid(this.genome.nodes[to].value)
                        delete this.genome.nodes[to].tmp
                    }
                }
            }
        }

        // calc
        for (let i in this.genome.nodes) {
            if (this.genome.nodes[i].type != "output") continue

            outputs.push(this.genome.nodes[i].value)
        }

        // console.log("output:", outputs)
        return outputs
    }

    getValue(node) {
        if (node.type == "input") {
            // if (node.sum == null) node.sum = node.value * node.weight
            return node.value
        }

        let sum = 0
        let connect = this.genome.connections[node.index]
        for (let i = 0; i < connect.length; i++) {
            sum += this.getValue(this.genome.nodes[connect[i].index]) * connect[i].weight
        }
        return this.sigmoid(sum)
    }
}
function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

const xor = [
    { inputs: [0, 0], outputs: [0] },
    { inputs: [0, 1], outputs: [1] },
    { inputs: [1, 0], outputs: [1] },
    { inputs: [1, 1], outputs: [0] },
]
function fitnessFunction(genomes) {
    let winnerFitness, winnerGenomeID
    genomes.forEach((genome, genomeID) => {
        let fitness = 4
        const net = new FeedForwardNetwork(genome)
        for (let i in xor) {
            outputs = net.activate(xor[i].inputs)
            fitness -= Math.pow(outputs[0] - xor[i].outputs[0], 2)
        }
        genome.fitness = fitness

        if (winnerFitness == undefined || fitness > winnerFitness) {
            winnerFitness = fitness
            winnerGenomeID = genomeID
        }
    })
    // console.log(winnerFitness)
    return winnerGenomeID
}


const p = new Population(2, 1, 100)
let winner = p.run(fitnessFunction, 100)
console.log(winner.toJSON())
console.log(winner.fitness)

const net = new FeedForwardNetwork(winner)
for (let i in xor) {
    outputs = net.activate(xor[i].inputs)
    console.log(xor[i].inputs, outputs)
}

// winner = new Genome(p)
// winner.loadJSON({
//     nodes: {
//         '0': { type: 'input' },
//         '1': { type: 'input' },
//         '4': { type: 'node' },
//         '5': { type: 'node' },
//         '6': { type: 'node' },
//         '7': { type: 'node' },
//         '2': { type: 'output' },
//         '3': { type: 'output' }
//     },
//     connections: {
//         '2': [{ index: 7, weight: 0.1 }],
//         '3': [{ index: 6, weight: 0.3 }, { index: 7, weight: 0.4 }],
//         '7': [{ index: 4, weight: 0.3 }, { index: 5, weight: 0.4 }, { index: 6, weight: 0.4 }],
//         '4': [{ index: 0, weight: 0.3 }],
//         '5': [{ index: 0, weight: 0.3 }, { index: 1, weight: 0.3 }],
//         '6': [{ index: 1, weight: 0.3 }],
//     }
// })
// console.log(winner.toJSON())
// const net = new FeedForwardNetwork(winner)
// for (let i in xor) {
//     outputs = net.activate(xor[i].inputs)
//     console.log(xor[i].inputs, outputs)
// }
// console.log(winner.fitness)
