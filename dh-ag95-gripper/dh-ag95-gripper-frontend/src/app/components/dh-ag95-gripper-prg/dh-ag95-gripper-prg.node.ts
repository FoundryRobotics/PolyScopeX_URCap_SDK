import { ProgramNode } from '@universal-robots/contribution-api';

export enum GripperAction {
    grip = 'grip',
    release = 'release',
}

export interface DhAG95GripperPrgNode extends ProgramNode {
    type: 'foundry-robotics-dh-ag95-gripper-frontend-dh-ag95-gripper-prg';
    parameters: {
        action: GripperAction;
        width: number;
        force: number;
    };
}
