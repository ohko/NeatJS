var myChart = new Chart(document.getElementById('myChart'), {
    type: 'line',
    data: {
        datasets: [
            { label: "maxFitness", borderColor: "rgb(255, 99, 132)", backgroundColor: Chart.helpers.color("rgb(255, 99, 132)").alpha(0.1).rgbString(), data: [] },
            { label: "nodes", fill: false, borderColor: "rgb(54, 162, 235)", data: [], yAxisID: "2" },
            { label: "connections", fill: false, borderColor: "rgb(255, 159, 64)", data: [], yAxisID: "2" },
        ]
    },
    options: {
        scales: {
            xAxes: [{ type: 'linear' }],
            yAxes: [
                { type: 'linear', position: 'left', id: '1' },
                { type: 'linear', position: 'right', id: '2' },
            ],
        }
    }
});

function visualization(winner) {
    document.getElementById("preview").innerHTML = JSON.stringify(winner.toJSON())
    let data = [], links = []
    for (let n in winner.nodes) {
        data.push({ "draggable": true, "itemStyle": { "color": { input: "red", hidden: "black", output: "blue" }[winner.nodes[n].type] }, "name": winner.nodes[n].index + "", "symbolSize": 20 })
    }
    for (let n in winner.connections) {
        links.push({ "lineStyle": { "color": winner.connections[n].enabled ? "black" : "gray", "width": winner.connections[n].enabled ? 2 : 1 }, "source": winner.connections[n].from + "", "target": winner.connections[n].to + "" })
    }
    myEChart.setOption({ series: { data: data, edges: links } })
}

const data = [
    { inputs: [0, 0], outputs: [0] },
    { inputs: [0, 1], outputs: [1] },
    { inputs: [1, 0], outputs: [1] },
    { inputs: [1, 1], outputs: [0] },
]

let status = document.getElementById("status")
async function fitnessFunction(genomes, generation) {
    if (generation % 10 == 0) {
        status.innerHTML = "generation:" + generation +
            " nodes:" + Object.keys(genomes[0].nodes).length +
            " connections:" + genomes[0].connections.length +
            " maxFitness:" + genomes[0].fitness
        myChart.config.data.datasets[0].data.push({ x: generation, y: genomes[0].fitness })
        myChart.config.data.datasets[1].data.push({ x: generation, y: Object.keys(genomes[0].nodes).length })
        myChart.config.data.datasets[2].data.push({ x: generation, y: genomes[0].connections.length })
        myChart.update()

        visualization(genomes[0])
    }
    genomes.forEach(genome => {
        genome.fitness = 4
        const ff = net.FeedForwardNetwork(genome)
        for (let i in data) {
            outputs = ff.activate(data[i].inputs)
            genome.fitness -= Math.pow(outputs[0] - data[i].outputs[0], 2)
        }
    })
    await net.sleep(10)
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
        visualization(winner)
    }

    // { // test
    //     let genome = net.Genome({ population: pop })
    //     genome.loadJSON(js)
    //     const ff = net.FeedForwardNetwork(genome)
    //     for (let i in data) {
    //         outputs = ff.activate(data[i].inputs)
    //         console.log(data[i].inputs, "=>", data[i].outputs, "~", outputs.map(x => x.toFixed(5)))
    //     }
    // }
})()