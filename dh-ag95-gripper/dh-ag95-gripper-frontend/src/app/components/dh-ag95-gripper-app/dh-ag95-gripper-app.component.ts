import { ChangeDetectionStrategy, Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { first } from 'rxjs/operators';
import { ApplicationPresenter, RobotSettings } from '@universal-robots/contribution-api';
import { DhAG95GripperAppNode } from './dh-ag95-gripper-app.node';

@Component({
    templateUrl: './dh-ag95-gripper-app.component.html',
    styleUrls: ['./dh-ag95-gripper-app.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false,
})
export class DhAG95GripperAppComponent implements ApplicationPresenter, OnChanges {
    constructor(protected readonly translateService: TranslateService) {}

    // applicationNode is required
    @Input() applicationNode: DhAG95GripperAppNode;

    // robotSettings is optional
    @Input() robotSettings: RobotSettings;

    ngOnChanges(changes: SimpleChanges): void {
        if (changes?.robotSettings) {
            if (!changes?.robotSettings?.currentValue) {
                return;
            }

            if (changes?.robotSettings?.isFirstChange()) {
                this.translateService.setDefaultLang('en');
            }

            this.translateService.use(changes?.robotSettings?.currentValue?.language).pipe(first()).subscribe();
        }
    }
}
