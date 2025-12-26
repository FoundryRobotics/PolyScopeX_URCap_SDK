import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    inject,
    Input,
    OnChanges,
    OnInit,
    signal,
    SimpleChanges,
} from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { first } from 'rxjs/operators';
import { ProgramPresenter, ProgramPresenterAPI, RobotSettings, TreeContext } from '@universal-robots/contribution-api';
import { URCAP_ID, VENDOR_ID } from '../../../generated/contribution-constants';
import { XmlRpc } from '../xmlRpc';
import { GripperAction, DhAG95GripperPrgNode } from './dh-ag95-gripper-prg.node';

@Component({
    templateUrl: './dh-ag95-gripper-prg.component.html',
    styleUrls: ['./dh-ag95-gripper-prg.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false,
})
export class DhAG95GripperPrgComponent implements OnInit, OnChanges, ProgramPresenter {
    public readonly translateService = inject(TranslateService);
    private readonly cd = inject(ChangeDetectorRef);
    private xmlRpc: XmlRpc;

    // programTree is optional
    @Input() programTree: TreeContext;

    // presenterAPI is optional
    @Input() presenterAPI: ProgramPresenterAPI;

    // robotSettings is optional
    @Input() robotSettings: RobotSettings;

    // contributedNode is optional
    @Input() contributedNode: DhAG95GripperPrgNode;

    public showErrorMessage = signal<boolean>(false);

    public gripperIsBusy = signal<boolean>(false);

    public GripperAction = GripperAction;

    public static readonly forceValueConstraints = {
        lowerLimit: 20,
        upperLimit: 100,
    };
    public static readonly positionValueConstraints = {
        lowerLimit: 0,
        upperLimit: 1000,
    };

    ngOnInit(): void {
        this.translateService.setDefaultLang('en');
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.robotSettings) {
            if (!changes.robotSettings.currentValue) {
                return;
            }

            this.translateService.use(changes.robotSettings.currentValue.language).pipe(first()).subscribe();
        }

        if (changes.presenterAPI?.isFirstChange()) {
            const path = this.presenterAPI.getContainerContributionURL(VENDOR_ID, URCAP_ID, 'dh-ag95-gripper-backend', 'xmlrpc');
            this.xmlRpc = new XmlRpc(`//${path}/`);
        }
    }

    positionValueLimits = (position: number) => {
        if (
            DhAG95GripperPrgComponent.positionValueConstraints.lowerLimit != null &&
            DhAG95GripperPrgComponent.positionValueConstraints.upperLimit != null &&
            (position < DhAG95GripperPrgComponent.positionValueConstraints.lowerLimit ||
                position > DhAG95GripperPrgComponent.positionValueConstraints.upperLimit)
        ) {
            return this.translateService.instant('presenter.dh-ag95-gripper.label.position-error', {
                limit: DhAG95GripperPrgComponent.positionValueConstraints,
                unit: 'mm',
            });
        }
        return null;
    };

    forceValueLimits = (force: number) => {
        if (
            DhAG95GripperPrgComponent.forceValueConstraints.lowerLimit != null &&
            DhAG95GripperPrgComponent.forceValueConstraints.upperLimit != null &&
            (force < DhAG95GripperPrgComponent.forceValueConstraints.lowerLimit ||
                force > DhAG95GripperPrgComponent.forceValueConstraints.upperLimit)
        ) {
            return this.translateService.instant('presenter.dh-ag95-gripper.label.force-error', {
                limit: DhAG95GripperPrgComponent.forceValueConstraints,
                unit: 'N',
            });
        }
        return null;
    };

    changeAction(value: GripperAction) {
        const newType = GripperAction[value];
        if (newType !== this.contributedNode.parameters.action) {
            this.contributedNode.parameters.action = newType;
            this.saveNode();
        }
    }

    async onGripRelease(action: string) {
        this.gripperIsBusy.set(true);
        this.showError(false);
        try {
            if (action === GripperAction.grip) {
                this.doGrip(this.contributedNode.parameters.position, this.contributedNode.parameters.force);
            } else {
                this.doRelease(this.contributedNode.parameters.position);
            }
        } catch (error) {
            this.showError(true, error);
            this.gripperIsBusy.set(false);
        }
    }

    doGrip(position: number, force: number) {
        this.doRequest('dh_ag95_set_force', [force]);
        this.doRequest('dh_ag95_set_position', [position]);
    }

    doRelease(position: number) {
        this.doRequest('dh_ag95_set_position', [position]);
    }

    setPositionValue(newValue: number): void {
        const newPosition = Number(newValue);
        if (newPosition !== this.contributedNode.parameters.position) {
            this.contributedNode.parameters.position = newPosition;
            this.saveNode();
        }
    }

    setForceValue(newValue: number): void {
        const newForce = Number(newValue);
        if (newForce !== this.contributedNode.parameters.force) {
            this.contributedNode.parameters.force = newForce;
            this.saveNode();
        }
    }

    // call saveNode to save node parameters
    private async saveNode() {
        await this.presenterAPI.programNodeService.updateNode(this.contributedNode);
    }
    private showError(hasError: boolean, error?: unknown) {
        if (hasError && error) {
            console.error(error);
        }

        this.showErrorMessage.set(hasError);
    }

    private doRequest(methodName: string, params: number[]) {
        this.xmlRpc
            .sendXmlRpcRequest(methodName, params)
            .then((data) => this.showError(data.status !== 200, `XmlRpc.${methodName}(${params}) did not return true`))
            .catch((error) => this.showError(true, error))
            .finally(() => {
                this.gripperIsBusy.set(false);
            });
    }

    protected readonly Object = Object;
}
