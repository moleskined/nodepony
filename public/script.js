const DIJKSTRA = 'dj';
const BELLMAN_FORD = 'bf';
const DEFAULT_GRAPH_SIZE = 6;
const NODE_START_EDGES = 2;
const ADD_RETURN_EDGE = true;
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
    this.updateUi();
  }

  initGraph() {
    const container = document.getElementById('graph');
    const data = {
      nodes: this.visNodes,
      edges: this.visEdges,
    };
    const options = {};
    this._graphRenderer = new vis.Network(container, data, options);
  }

  next() {
    const state = this.state;
    
    if (!state._step) {
      state._step = 0;
    }
    
    if (state._step >= state.I) {
      return;
    }

    state._step++;

    const node = this._graph.nodeMap.get([...state.T][state._step-1]);
    const row = document.querySelector(`#iteration_${state._step}`);
    row.className = row.className.replace('step-hidden', '');

    this._graphRenderer.selectNodes([`node_${node.name}`]);
    this.updateUi();
  }

  back() {
    const state = this.state;
    
    if (!state._step) {
      state._step = 0;
    }

    if (state._step < 2) {
      return;
    }
    
    const row = document.querySelector(`#iteration_${state._step}`);
    state._step--;
    const node = this._graph.nodeMap.get([...state.T][state._step-1]);
    row.className = row.className = 'step-hidden';

    this._graphRenderer.selectNodes([`node_${node.name}`]);
    this.updateUi();
  }

  updateUi() {
    if (!this.state) {
      document.querySelectorAll('button').forEach((button) => {
        button.disabled = true;
      });

      return;
    }

    document.getElementById('state_over').disabled = false;
    document.getElementById('back').disabled = !this.state._step || this.state._step < 2;
    document.getElementById('next').disabled = (this.state._step >= this.state.I);
  }

  initState() {
    const set = this._set;
    const nodeMap = this._graph.nodeMap;
    const tableHead = document.querySelectorAll('#working thead tr');
    tableHead[0].innerHTML = `<th rowspan="2">I</th><th rowspan="2">T</th>`;
    tableHead[1].innerHTML = ``;

    const table = this._state = {
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
    this.processDijkstra(startNode, table);
    this.updateUi();
  }

  processDijkstra(node, table) {
    table.I++;
    table.T.add(node.name);

    const l = table.L.get(node.name);   // Current node
    node.edges.forEach(edge => {
      const { to, weight } = edge;
      const ln = table.L.get(to.name);

      const totalCost = l.cost !== Infinity ? l.cost + weight : weight;
      if (totalCost < ln.cost) {
        ln.cost = totalCost;
        ln.path = l.path.length < 1 ? [node.name, to.name] : [...l.path, ln.name];
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
    this._drawRow(table);

    do {
      nextL = sorted.pop();
    } while (nextL && table.T.has(nextL.name))

    if (!nextL) {
      return;
    }

    const nextNode = this._graph.nodeMap.get(nextL.name);
    this.processDijkstra(nextNode, table);
  }

  _drawRow(table) {
    const body = this._tableBody;
    const row = createElement('tr', { 'class': 'step-hidden' });
    row.id = `iteration_${table.I}`;
    body.appendChild(row);

    let cell = document.createElement('td');
    cell.innerHTML = `<span>${table.I}</span>`;
    row.appendChild(cell);

    cell = document.createElement('td');
    cell.innerHTML = `<span>{${Array.from(table.T)}}</span>`;
    row.appendChild(cell);

    table.L.forEach(l => {
      if (this.start !== l.name) {
        cell = document.createElement('td');
        cell.innerHTML = `<span>${l.cost !== Infinity ? l.cost : '∞'}</span>`;
        row.appendChild(cell);

        cell = document.createElement('td');
        cell.innerHTML = `<span>${l.path.join('–')}</span>`;
        row.appendChild(cell);
      }
    });
  }

  get visNodes() {
    return new vis.DataSet(this._graph.nodes.map(node => ({
      id: `node_${node.name}`,
      label: node.label,
    })));
  }

  get visEdges() {
    const allEdges = [];
    this._graph.nodes.forEach(node => node.edges.forEach(edge => {
      allEdges.push({
        id: `edge_${node.name}_${edge.to.name}`,
        label: `${edge.weight}`,
        from: `node_${node.name}`,
        to: `node_${edge.to.name}`,
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

  get state() {
    return this._state;
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
  app.initState();
};

const createElement = (type, attributes = {}) => {
  const element = document.createElement(type);
  for (let name in attributes) {
    const attribute = document.createAttribute(name);
    attribute.value = attributes[name];
    element.setAttributeNode(attribute);
  }
  return element;
};

newGraph();