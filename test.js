#!/usr/bin/env node

const { Neat } = require("./neatjs")
console.log("\033c")

// test
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
                genome.fitness -= Math.pow(outputs[0] - data[i].outputs[0], 2)
            }
        })
        if (generation % 10 == 0) {
            genomes.sort((a, b) => { return a.fitness > b.fitness ? -1 : 1 })
            console.log("generation:", generation,
                "nodes:", genomes[0].getActiveNodeNumber() + "/" + Object.keys(genomes[0].nodes).length,
                "connections:", genomes[0].getActiveConnectionsNumber() + "/" + genomes[0].connections.length,
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
            // console.log(JSON.stringify(winner.toJSON()))
            console.log("[winner] nodes:", winner.getActiveNodeNumber() + "/" + winner.nextNodeID, "connects:", winner.getActiveConnectionsNumber() + "/" + winner.connections.length)
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
}
