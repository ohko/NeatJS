var myChart = new Chart(document.getElementById('myChart'), {
    type: 'line',
    data: {
        datasets: [
            { label: "maxScore", borderColor: "rgb(255, 99, 132)", backgroundColor: Chart.helpers.color("rgb(255, 99, 132)").alpha(0.1).rgbString(), data: [] },
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

class PP {
    constructor() {
        this.init = _ => {
            this.x = 1;
            this.y = 1;
            this.alive = true;
            this.win = false;
            this.score = 0;
            this.fitness = 0;
            this.pillCount = 0;
        };
        this.setMap = m => {
            this.map = [...m.map(x => [...x])];
            for (var y = 0; y < this.map.length; y++) {
                for (var x = 0; x < this.map[y].length; x++) {
                    if (this.map[y][x] == 1)
                        this.pillCount++;
                }
            }
        };
        this.update = _ => {
            if (this.map[this.y][this.x] == WALL || this.score < 0) {
                this.alive = false;
                return;
            } else if (this.map[this.y][this.x] == PILL) {
                this.score += 1;
                this.fitness += 1;
                this.map[this.y][this.x] = EMPTY;
                this.pillCount--;
            }
            if (this.pillCount == 0) {
                this.win = true;
                return;
            }
            this.score -= 0.1;
        };
        this.getInputs = _ => {
            let near = map.length * map[0].length;
            let nearX = 0, nearY = 0;
            for (let y = 0; y < map.length; y++) {
                for (let x = 0; x < map[0].length; x++) {
                    if (this.map[y][x] != 1)
                        continue;
                    let dis = Math.sqrt(Math.pow(this.x - x, 2) + Math.pow(this.y - y, 2));
                    if (dis < near) {
                        near = dis;
                        nearX = x;
                        nearY = y;
                    }
                }
            }

            var graph = new Graph(map);
            var start = graph.grid[this.y][this.x];
            var end = graph.grid[nearY][nearX];
            var result = astar.search(graph, start, end);
            if (result.length == 0)
                result = [{ x: this.x, y: this.y, m: 1 }];
            let quick = result[0];

            let inputs = [0, 0, 0, 0, 0, 0];
            if (quick.y < this.x)
                inputs[0] = 1;
            else if (quick.y > this.x)
                inputs[2] = 1;
            else
                inputs[1] = 1;
            if (quick.x < this.y)
                inputs[3] = 1;
            else if (quick.x > this.y)
                inputs[5] = 1;
            else
                inputs[4] = 1;

            // console.log([this.x, this.y], [nearX, nearY], JSON.stringify(result), inputs)
            return inputs;
        };
        this.move = outputs => {
            if (outputs[0] > 0.5) {
                if (outputs[1] > 0.5)
                    this.y--;
                else
                    this.y++;
            } else {
                if (outputs[1] > 0.5)
                    this.x--;
                else
                    this.x++;
            }
        };
        this.getMap = _ => {
            var html = [];
            for (var y = 0; y < this.map.length; y++) {
                var tmp = "";
                for (var x = 0; x < this.map[y].length; x++) {
                    if (x == this.x && y == this.y)
                        tmp += "O";
                    else if (this.map[y][x] == 2)
                        tmp += " ";
                    else if (this.map[y][x] == 0)
                        tmp += "X";
                    else
                        tmp += ".";
                }
                html.push(tmp);
            }
            return html.join("\n");
        };
    }
}

let status = document.getElementById("status")
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
            await net.sleep(10)
        }
        genome.fitness = p.fitness
    }
    status.innerHTML = "generation:" + generation +
        " nodes:" + Object.keys(genomes[0].nodes).length +
        " connections:" + genomes[0].connections.length +
        " maxScore:" + maxScore
    myChart.config.data.datasets[0].data.push({ x: generation, y: maxScore })
    myChart.config.data.datasets[1].data.push({ x: generation, y: Object.keys(genomes[0].nodes).length })
    myChart.config.data.datasets[2].data.push({ x: generation, y: genomes[0].connections.length })
    myChart.update()
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

    // { // test
    //     let genome = net.Genome({ population: pop })
    //     // genome.loadJSON(JSON.parse('{"nodes":{"0":{"type":"input"},"1":{"type":"input"},"2":{"type":"input"},"3":{"type":"input"},"4":{"type":"input"},"5":{"type":"input"},"6":{"type":"output"},"7":{"type":"output"}},"connections":[{"from":0,"to":6,"weight":0.09298780904693427,"enabled":true,"innovation":72},{"from":1,"to":6,"weight":0.998808534281387,"enabled":true,"innovation":73},{"from":2,"to":6,"weight":0.25665064612309907,"enabled":true,"innovation":74},{"from":3,"to":6,"weight":-0.6716407639665412,"enabled":true,"innovation":75},{"from":4,"to":6,"weight":-0.8914710215967268,"enabled":true,"innovation":76},{"from":5,"to":6,"weight":0.5249001726482141,"enabled":true,"innovation":77},{"from":0,"to":7,"weight":0.9426272421981134,"enabled":true,"innovation":78},{"from":1,"to":7,"weight":-0.6235430132062976,"enabled":true,"innovation":79},{"from":2,"to":7,"weight":-0.20917113335517845,"enabled":true,"innovation":80},{"from":3,"to":7,"weight":0.9134000856292714,"enabled":true,"innovation":81},{"from":4,"to":7,"weight":-0.5985527907560377,"enabled":true,"innovation":82},{"from":5,"to":7,"weight":0.231813991575613,"enabled":true,"innovation":83}],"fitness":20}'))
    //     genome.loadJSON(JSON.parse('{"nodes":{"0":{"type":"input"},"1":{"type":"input"},"2":{"type":"input"},"3":{"type":"input"},"4":{"type":"input"},"5":{"type":"input"},"6":{"type":"output"},"7":{"type":"output"}},"connections":[{"from":0,"to":6,"weight":-0.948720954783036,"enabled":true,"innovation":1361},{"from":1,"to":6,"weight":0.6514481670555474,"enabled":true,"innovation":1362},{"from":2,"to":6,"weight":-0.3476279913941305,"enabled":true,"innovation":1363},{"from":3,"to":6,"weight":0.9144340771562166,"enabled":true,"innovation":1364},{"from":4,"to":6,"weight":-0.8996647149561015,"enabled":true,"innovation":1365},{"from":5,"to":6,"weight":-0.3247419203711557,"enabled":true,"innovation":1366},{"from":0,"to":7,"weight":0.9041649485100445,"enabled":true,"innovation":1367},{"from":1,"to":7,"weight":-0.1246774588954982,"enabled":true,"innovation":1368},{"from":2,"to":7,"weight":-0.8526145057513461,"enabled":true,"innovation":1369},{"from":3,"to":7,"weight":0.2071473255379922,"enabled":true,"innovation":1370},{"from":4,"to":7,"weight":0.47735457706527296,"enabled":true,"innovation":1371},{"from":5,"to":7,"weight":-0.7293140830085756,"enabled":true,"innovation":1372}]}'))
    //     await fitnessFunction([genome], 0)
    // }
})()