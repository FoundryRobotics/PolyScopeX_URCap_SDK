/// <reference lib="webworker" />
import { ProgramBehaviors, ProgramNode, registerProgramBehavior, ScriptBuilder } from '@universal-robots/contribution-api';
import { GripperAction, DhAG95GripperPrgNode } from './dh-ag95-gripper-prg.node';

const createGripLabel = async (node: DhAG95GripperPrgNode): Promise<string> => {
    return `Grip (${node.parameters.width},${node.parameters.force})`;
};
const createReleaseLabel = async (node: DhAG95GripperPrgNode): Promise<string> => `Release (${node.parameters.width})`;

const createProgramNodeLabel = async (node: DhAG95GripperPrgNode): Promise<string> =>
    node.parameters.action === GripperAction.grip ? createGripLabel(node) : createReleaseLabel(node);

// factory is required
const createProgramNode = async (): Promise<DhAG95GripperPrgNode> => ({
    type: 'foundry-robotics-dh-ag95-gripper-frontend-dh-ag95-gripper-prg',
    version: '1.0.0', // version is required
    lockChildren: false,
    allowsChildren: false,
    parameters: {
        action: GripperAction.grip,
        width: 0,
        force: 20,
    },
});

const generateGripCode = (node: DhAG95GripperPrgNode) => {
    const builder = new ScriptBuilder();
    const width: number = node.parameters.width;
    const force: number = node.parameters.force;
    builder.addStatements(`dh_ag95_close_wait(${force},${width})\n`);
    return builder;
};

const generateReleaseCode = (node: DhAG95GripperPrgNode) => {
    const builder = new ScriptBuilder();
    const width: number = node.parameters.width;
    builder.addStatements(`dh_ag95_open_wait(${width})\n`);
    return builder;
};

const generateScriptCodeBefore = (node: DhAG95GripperPrgNode): ScriptBuilder =>
    node.parameters.action === GripperAction.grip ? generateGripCode(node) : generateReleaseCode(node);

// Add upgrade implementation here
const nodeUpgrade = (loadedNode: ProgramNode): ProgramNode => loadedNode;

const behaviors: ProgramBehaviors = {
    programNodeLabel: createProgramNodeLabel,
    factory: createProgramNode,
    generateCodeBeforeChildren: generateScriptCodeBefore,
    upgradeNode: nodeUpgrade,
};

registerProgramBehavior(behaviors);
