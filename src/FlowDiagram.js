import React, {  useCallback, useRef } from 'react';
import { MiniMap, Controls } from 'react-flow-renderer';
import Dagre from '@dagrejs/dagre';
import ReactFlow, {
  ReactFlowProvider, 
  Panel,
  useNodesState,
  useEdgesState,
  useReactFlow,
} from 'react-flow-renderer';
import { useFlow } from './FlowContext';
import ImageNode from './customNodes/ImageNode';
import CircularNode from './customNodes/CircularNode';
import CustomNodeComponent from './customNodes/CustomNodeComponent';
import IconNode from './customNodes/IconNode';
import myImage from './logo_1.png';
import './App.css';


let branchCounter = 1;

const FlowDiagram = () => {
  const { nodes, edges, setNodes, setEdges, history, currentHistoryIndex,
    setHistory,setCurrentHistoryIndex } = useFlow();
  const reactFlowWrapper = useRef(null);
  const nodeIdRef = useRef(nodes.length + 1);
  const pushToHistory = useCallback((newNodes, newEdges) => {
    const newHistory = history.slice(0, currentHistoryIndex + 1);
    newHistory.push({ nodes: newNodes, edges: newEdges });
    setHistory(newHistory);
    setCurrentHistoryIndex(newHistory.length - 1);
  }, [history, currentHistoryIndex]);

  const addNode = useCallback((type) => {
    let newNode = {
      id: `node_${nodeIdRef.current++}`,
      type, // This directly assigns the type passed to the function
      position: { x: Math.random() * window.innerWidth * 0.5, y: Math.random() * window.innerHeight * 0.5 },
    };

    // Adjust data based on node type
    if (type === 'circular' || type === 'iconNode' || type === 'imageNode') {
      newNode.data = { label: `${type.charAt(0).toUpperCase() + type.slice(1)} Node ${nodeIdRef.current}` };
      if (type === 'imageNode') {
        newNode.data.imageUrl = myImage; // Directly use the imported image for image nodes
      }
    } else {
      // Default and other predefined types like 'input' or 'output'
      newNode.data = { label: `${type.charAt(0).toUpperCase() + type.slice(1)} Node ${nodeIdRef.current}` };
    }

    const newNodes = [...nodes, newNode];
    pushToHistory(newNodes, edges);
    setNodes(newNodes);
  }, [nodes, edges, pushToHistory]);

  const onConnect = useCallback((params) => {
    const { source, target } = params;
    const sourceNode = nodes.find((n) => n.id === source);
    const targetNode = nodes.find((n) => n.id === target);
    // Determine if we're starting a new branch or continuing an existing one
    if (sourceNode.type === 'circular' || sourceNode.data.branch) {
      let branchName;
      let branchLevel;
    if (sourceNode.type === 'circular') {
      // Generate a unique branch name based on the ID of the source circular node
      branchName = `branch_${branchCounter}`;
      branchLevel = 1;
      branchCounter++;
    } else {
      // If the source already has a branch assigned, use that branch name
      branchName = sourceNode.data.branch;
      branchLevel= sourceNode.data.level + 1; 
    }

      const updatedNodes = nodes.map(node => {
        if (node.id === target) {
          return {
            ...node,
            data: {
              ...node.data,
              branch: branchName, // Assign the branch name
              level: branchLevel,
            },
          };
        }
        return node;
      });
      // Update the nodes state with the new branch information
      setNodes(updatedNodes);
    }
    if (shouldPreventConnection(sourceNode, targetNode)) {
      console.error("Invalid connection between parallel nodes.",sourceNode.data.branchName, targetNode.data.branchName);
      return;
    }
    // Determine if the connection is leading to the end of a parallel branch
    if (isEndOfParallelBranch(sourceNode, targetNode)) {
      // Update the label of the source node or perform any action as needed
      const updatedNodes = nodes.map(node => {
        if (node.id === source) {
          return {
            ...node,
            data: {
              ...node.data,
              label: `End of parallel ${node.data.branch} `
            }
          };
        }
        return node;
      });

      // Update nodes state
      setNodes(updatedNodes);
    }
    setEdges((eds) => [...eds, { id: `e${params.source}-${params.target}`, ...params }]);
    nodes.forEach(node => {
      console.log(node);
    });

  }, [nodes, edges, setEdges, setNodes]);

  function shouldPreventConnection(sourceNode, targetNode) {
    // Rule 1: Prevent direct connections between circular nodes
    if (sourceNode.type === 'circular' && targetNode.type === 'circular') {
      alert("Can't connect two circular nodes.....")
      return true;
    }
    const sourceBranch = sourceNode.data.branch; // Assuming 'branch' is a property indicating the node's branch
    const targetBranch = targetNode.data.branch;
    // Check if both branches are defined before comparing them
    if (sourceBranch && targetBranch && sourceBranch !== targetBranch) {
      alert(`Cannot connect nodes from different branches: ${sourceBranch} to ${targetBranch}`);
      return true; // Prevents connecting nodes from different branches
    }


  // Rule 2: Optionally, prevent connecting back to a node that's already in the path
  // This requires checking the edges to see if making this connection creates a loop
  const createsLoop = edges.some(edge => edge.source === targetNode.id && edge.target === sourceNode.id);
  if (createsLoop) {
    return true;
  }
    // Example: Prevent connecting if both nodes are of a specific type that shouldn't be connected
    // Adjust the logic as necessary
    return false; // Placeholder logic
  }
  
  // Helper function to check if this connection marks the end of a parallel branch
  function isEndOfParallelBranch(sourceNode, targetNode) {
    // Implement your logic to determine if the target node marks the end of a parallel branch
    // This could be based on the node types, positions, or other properties
    return targetNode.type === 'circular'; // Example condition
  }

  const onNodeDragStop = useCallback((event, node) => {
    const newNodes = nodes.map((nd) => {
      if (nd.id === node.id) {
        return {
          ...nd,
          position: node.position,
        };
      }
      return nd;
    });
    pushToHistory(newNodes, edges);
    setNodes(newNodes);
    
  }, [nodes, edges, pushToHistory]);









  
  const makeNodesEquispacedAndCentered = useCallback(() => {
    if (!reactFlowWrapper.current || nodes.length === 0) return;

    const spacingBetweenBranches = 250; // Spacing between branches (columns)
    const spacingBetweenLevels = 200; // Spacing between levels (rows)
    const containerWidth = reactFlowWrapper.current.offsetWidth;
    const containerHeight = reactFlowWrapper.current.offsetHeight;
    const centerX = containerWidth / 2;
    const centerY = containerHeight / 2;

    // Group nodes by branch name
    const branchNodesMap = {};
    nodes.forEach(node => {
        const branchName = node.data.branch;
        if (branchName) {
            if (!branchNodesMap[branchName]) {
                branchNodesMap[branchName] = [];
            }
            branchNodesMap[branchName].push(node);
        }
    });

    // Arrange branches horizontally
    const branchNames = Object.keys(branchNodesMap);
    const totalBranches = branchNames.length;
    const branchSpacing = (totalBranches - 1) * spacingBetweenBranches;
    const initialX = centerX - branchSpacing / 2;
    let currentX = initialX;

    // Iterate over each branch to arrange nodes vertically
    branchNames.forEach(branchName => {
        const branchNodes = branchNodesMap[branchName];
        const totalLevels = branchNodes.length;
        const levelSpacing = (totalLevels - 1) * spacingBetweenLevels;
        let currentY = centerY - levelSpacing / 2;

        // Arrange nodes vertically for the current branch
        branchNodes.forEach(node => {
            node.position = { x: currentX, y: currentY };
            currentY += spacingBetweenLevels;
        });

        // Move to the next branch
        currentX += spacingBetweenBranches;
    });

    let totalX = 0;
    let totalNodes = 0;
    nodes.forEach(node => {
        if (node.data.branch) {
            totalX += node.position.x;
            totalNodes++;
        }
    });
    const averageX = totalNodes > 0 ? totalX / totalNodes : centerX;

// Center nodes without branches and levels
const nodesWithoutBranch = nodes.filter(node => !node.data.branch);
nodesWithoutBranch.forEach(node => {
    node.position = { x: averageX, y: node.position.y };
}); 
    // Update nodes with their new positions
    const updatedNodes = nodes.map(node => {
        if (node.data.branch) {
            return branchNodesMap[node.data.branch].find(n => n.id === node.id);
        }
        return node;
    });

    // Update nodes with equispaced positions
    pushToHistory(updatedNodes, edges);
    setNodes(updatedNodes);
}, [nodes, edges, pushToHistory, reactFlowWrapper]);

























  
  const undo = useCallback(() => {
    if (currentHistoryIndex === 0) return;
    const newIndex = currentHistoryIndex - 1;
    const prevState = history[newIndex];
    setCurrentHistoryIndex(newIndex);
    setNodes(prevState.nodes);
    setEdges(prevState.edges);
  }, [history, currentHistoryIndex]);

  const redo = useCallback(() => {
    if (currentHistoryIndex >= history.length - 1) return;
    const newIndex = currentHistoryIndex + 1;
    const nextState = history[newIndex];
    setCurrentHistoryIndex(newIndex);
    setNodes(nextState.nodes);
    setEdges(nextState.edges);

  }, [history, currentHistoryIndex]);


  // React Flow setup and event handlers here
  const nodeTypes = {
    customNodeType: CustomNodeComponent,
    circular: CircularNode,
    imageNode: ImageNode,
    iconNode: IconNode,

  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ justifyContent: 'space-evenly', padding: '10px' }}>
        <button className="button" onClick={makeNodesEquispacedAndCentered}>Equispace Nodes</button>
        <button className="button" onClick={redo}>Redo</button>
        <button className="button" onClick={undo}>Undo</button>
        <button className="button" onClick={() => addNode('circular')}>Add Circular Node</button>
        <button className="button" onClick={() => addNode('iconNode')}>Add ICON Node</button>
        <button className="button" onClick={() => addNode('imageNode')}>Add Image Node</button>
        <button className="button" onClick={() => addNode('default')}>Add Default Node</button>
      </div>
      <div ref={reactFlowWrapper} style={{ height: '100vh' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          onNodeDragStop={onNodeDragStop}
        // other props
        >
          <MiniMap />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
};

export default FlowDiagram;
