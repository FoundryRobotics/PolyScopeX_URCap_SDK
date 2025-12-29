import { HttpBackend, HttpClientModule } from '@angular/common/http';
import { DoBootstrap, Injector, NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { createCustomElement } from '@angular/elements';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { MultiTranslateHttpLoader } from 'ngx-translate-multi-http-loader';
import { UIAngularComponentsModule } from '@universal-robots/ui-angular-components';
import { PATH } from '../generated/contribution-constants';
import { DhAG95GripperAppComponent } from './components/dh-ag95-gripper-app/dh-ag95-gripper-app.component';
import { DhAG95GripperPrgComponent } from './components/dh-ag95-gripper-prg/dh-ag95-gripper-prg.component';

export const httpLoaderFactory = (http: HttpBackend) =>
    new MultiTranslateHttpLoader(http, [
        { prefix: PATH + '/assets/i18n/', suffix: '.json' },
        { prefix: './ui/assets/i18n/', suffix: '.json' },
    ]);

@NgModule({
    declarations: [DhAG95GripperPrgComponent, DhAG95GripperAppComponent],
    schemas: [NO_ERRORS_SCHEMA],
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        UIAngularComponentsModule,
        HttpClientModule,
        TranslateModule.forRoot({
            loader: {
                provide: TranslateLoader,
                useFactory: httpLoaderFactory,
                deps: [HttpBackend],
            },
            useDefaultLang: false,
        }),
    ],
    providers: [],
})
export class AppModule implements DoBootstrap {
    constructor(private injector: Injector) {}

    ngDoBootstrap() {
        const xmlrpcGripperPrgComponent = createCustomElement(DhAG95GripperPrgComponent, { injector: this.injector });
        customElements.define('foundry-robotics-dh-ag95-gripper-frontend-dh-ag95-gripper-prg', xmlrpcGripperPrgComponent);
        const xmlrpcGripperAppComponent = createCustomElement(DhAG95GripperAppComponent, { injector: this.injector });
        customElements.define('foundry-robotics-dh-ag95-gripper-frontend-dh-ag95-gripper-app', xmlrpcGripperAppComponent);
    }

    // This function is never called, because we don't want to actually use the workers, just tell webpack about them
    registerWorkersWithWebPack() {
        new Worker(
            new URL(
                './components/dh-ag95-gripper-app/dh-ag95-gripper-app.behavior.worker.ts',
                /* webpackChunkName: "dh-ag95-gripper-app.worker" */ import.meta.url,
            ),
            {
                name: 'dh-ag95-gripper-app',
                type: 'module',
            },
        );
        new Worker(
            new URL(
                './components/dh-ag95-gripper-prg/dh-ag95-gripper-prg.behavior.worker.ts',
                /* webpackChunkName: "dh-ag95-gripper-prg.worker" */ import.meta.url,
            ),
            {
                name: 'dh-ag95-gripper-prg',
                type: 'module',
            },
        );
        new Worker(
            new URL(
                './components/dh-ag95-gripper-smartskill/dh-ag95-gripper-smartskill.behavior.worker.ts',
                /* webpackChunkName: "dh-ag95-gripper-smartskill.worker" */ import.meta.url,
            ),
            {
                name: 'dh-ag95-gripper-smartskill',
                type: 'module',
            },
        );
    }
}
