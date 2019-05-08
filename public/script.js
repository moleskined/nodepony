const DIJKSTRA = 'dj';
const BELLMAN_FORD = 'bf';
const DEFAULT_GRAPH_SIZE = 6;
const NODE_START_EDGES = 2;
const ADD_RETURN_EDGE = false;
const WEIGHT_SCALE = 10;
const DEFAULT_METHOD = DIJKSTRA;

class Node {
  constructor(name) {
    this._edges = [];
    this._name = `${name}`;
    this._edgeRef = {};
  }

  appendNode(destinationNode, addReturnEdge = ADD_RETURN_EDGE) {
    const edges = this._edges;
    const edgeRef = this._edgeRef;

    if (!edgeRef[destinationNode.name]) {
      const edge = edgeRef[destinationNode.name] = new Edge(destinationNode, this, {
        weight: Math.ceil(Math.random() * WEIGHT_SCALE),
      });
      edges.push(edge);
  
      if (addReturnEdge) {
        destinationNode.appendNode(this, false);
      }
    }
  }

  get edges() {
    return this._edges;
  }

  get name() {
    return this._name;
  }

  get label() {
    return this._name;
  }
}

class Edge {
  constructor(to, from, props) {
    this._to = to;
    this._from = from;
    this._props = props;
  }

  get to() {
    return this._to;
  }

  get weight() {
    return this._props.weight;
  }
}

class Network {
  constructor(options) {
    const {
      size,
      addReturnEdge,
    } = options;
    this._size = size;
    this._addReturnEdge = addReturnEdge;
    this._nodes = [];
    this.createNodes();
  }

  createNodes() {
    const maxNodes = this._size;
    const rootNode = new Node(1);
    this._nodes.push(rootNode);

    this._buildTree([rootNode], 0, maxNodes);
    this._addAdditionalEdges();
  }

  get nodeMap() {
    return new Map(this._nodes.map(n => ([n.name, n])));
  }

  get nodes() {
    return this._nodes;
  }

  _addAdditionalEdges() {
    const maxNodes = this._size;
    const nodeMap = this.nodeMap;
    this._nodes.forEach((node, i) => {
      if (node.edges.length < NODE_START_EDGES) {
        let randomIndex = Math.floor(Math.random() * maxNodes);
        while (randomIndex === i) {
          randomIndex = Math.floor(Math.random() * maxNodes);
        }

        const reverse = Math.random() > 0.5;
        if (reverse) {
          nodeMap.get(`${randomIndex + 1}`).appendNode(node, this._addReturnEdge);
        } else {
          node.appendNode(nodeMap.get(`${randomIndex + 1}`), this._addReturnEdge);
        }
      }
    });
  }

  _buildTree(nodeTable, index, max) {
    const nextNodeTable = [];
    for (let i = 0; i < nodeTable.length; i++) {
      const parentNode = nodeTable[i];
      for (let i = 0; i < NODE_START_EDGES; i++) {
        index++;
        if (index < max) {
          const node = new Node(index+1);
          parentNode.appendNode(node, this._addReturnEdge);
          nextNodeTable.push(node);
        }
      }
    }

    this._nodes.push(...nextNodeTable);
    
    if (index < max) {
      this._buildTree(nextNodeTable, index, max);
    }
  }
}

class App {
  constructor(graph, options) {
    this._graph = graph;
    this._set = graph.nodes;
    this._options = options;
    this._tableBody = document.querySelector('#working tbody');
    this._tableBody.innerHTML = '';
  }

  initGraph() {
    const container = document.getElementById('graph');
    const data = {
      nodes: this.visNodes,
      edges: this.visEdges,
    };
    const options = {};
    const graphRender = new vis.Network(container, data, options);
  }

  get visNodes() {
    return new vis.DataSet(this._graph.nodes.map(node => ({
      id: node.name,
      label: node.label,
    })));
  }

  get visEdges() {
    const allEdges = [];
    this._graph.nodes.forEach(node => node.edges.forEach(edge => {
      allEdges.push({
        label: `${edge.weight}`,
        from: node.name,
        to: edge.to.name,
        arrows: {
          to: {
            type: 'arrow',
            enabled: true,
          }
        },
      });
    }));
    return allEdges;
  }

  get start() {
    return `${this._options.start}`;
  }

  initTable() {
    const set = this._set;
    const nodeMap = this._graph.nodeMap;
    const tableHead = document.querySelectorAll('#working thead tr');
    tableHead[0].innerHTML = `<th rowspan="2">I</th><th rowspan="2">T</th>`;
    tableHead[1].innerHTML = ``;

    const table = {
      I: 0,           // Iteration
      T: new Set(),   // Set of nodes so far incorporated
      L: new Map(),
    };

    set.forEach(s => {
      table.L.set(s.name, {
        name: s.name,
        cost: Infinity,
        path: [],
      });
      if (s.name !== this.start) {
        let th = document.createElement('th');
        let colspan = document.createAttribute('colspan');
        colspan.value = 2;
        th.innerText = `L(${s.name})`;
        th.setAttributeNode(colspan);
        tableHead[0].appendChild(th);

        th = document.createElement('th');
        th.innerText = 'w';
        tableHead[1].appendChild(th);
        th = document.createElement('th');
        th.innerText = 'p';
        tableHead[1].appendChild(th);
      }
    });

    const startNode = nodeMap.get(this.start);
    this.initialise(startNode, table);
  }

  initialise(node, table) {
    table.I++;
    table.T.add(node.name);

    node.edges.forEach(edge => {
      const { to, weight } = edge;
      const ln = table.L.get(to.name);

      ln.cost = weight;
      ln.path = [node.name, to.name];
    });

    const sorted = Array.from(table.L)
    .map(t => t[1])
    .sort((n1, n2) => {
      if (n1.cost > n2.cost) {
        return -1;
      }
      if (n1.cost < n2.cost) {
        return 1;
      }
      return 0;
    });

    let nextL;

    do {
      nextL = sorted.pop();
    } while (nextL && table.T.has(nextL.name))

    if (!nextL) {
      throw Error('Why no next node??');
    }

    this._dumpTable(table);
    const nextNode = this._graph.nodeMap.get(nextL.name);
    this.process(nextNode, table);
  }

  process(node, table) {
    table.I++;
    table.T.add(node.name);

    const l = table.L.get(node.name);
    node.edges.forEach(edge => {
      const { to, weight } = edge;
      const ln = table.L.get(to.name);

      const totalCost = l.cost + weight;
      if (totalCost < ln.cost) {
        ln.cost = totalCost;
        ln.path = [...l.path, ln.name];
      }
    });

    const sorted = Array.from(table.L)
    .map(t => t[1])
    .sort((n1, n2) => {
      if (n1.cost > n2.cost) {
        return -1;
      }
      if (n1.cost < n2.cost) {
        return 1;
      }
      return 0;
    });

    let nextL;

    do {
      nextL = sorted.pop();
    } while (nextL && table.T.has(nextL.name))

    if (!nextL) {
      return;
    }

    this._dumpTable(table);
    const nextNode = this._graph.nodeMap.get(nextL.name);
    this.process(nextNode, table);
  }

  _dumpTable(table) {
    const body = this._tableBody;
    const row = document.createElement('tr');
    body.appendChild(row);

    let cell = document.createElement('td');
    cell.innerText = table.I;
    row.appendChild(cell);

    cell = document.createElement('td');
    cell.innerText = `{${Array.from(table.T)}}`;
    row.appendChild(cell);

    table.L.forEach(l => {
      if (this.start !== l.name) {
        cell = document.createElement('td');
        cell.innerText = l.cost !== Infinity ? l.cost : '∞';
        row.appendChild(cell);

        cell = document.createElement('td');
        cell.innerText = l.path.join('–');
        row.appendChild(cell);
      }
    });
  }
}

let app = null;

// Set control defaults
const addReturnEdge = document.getElementById('addReturnEdge');
const graphSize = document.getElementById('graphSize');
const startNode = document.getElementById('start_node');
const finishNode = document.getElementById('finish_node');

addReturnEdge.checked = ADD_RETURN_EDGE;
graphSize.value = DEFAULT_GRAPH_SIZE;
startNode.value = 1;
finishNode.value = DEFAULT_GRAPH_SIZE;

const newGraph = (confirm) => {
  if (confirm && !window.confirm(`Start new graph? Progress will be lost.`)) {
    return;
  }

  const options = {
    addReturnEdge: addReturnEdge.checked,
    size: graphSize.value,
  };

  app = new App(new Network(options), {
    start: startNode.value,
    end: finishNode.value = graphSize.value,
  });

  app.initGraph();
  app.initTable();
};

newGraph();