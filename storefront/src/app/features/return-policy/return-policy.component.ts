import { Component, inject } from '@angular/core';
import { SiteConfigService } from '../../core/services/site-config.service';

@Component({
  selector: 'app-return-policy',
  standalone: true,
  imports: [],
  templateUrl: './return-policy.component.html',
  styleUrl: './return-policy.component.scss',
})
export class ReturnPolicyComponent {
  private readonly siteConfig = inject(SiteConfigService);

  readonly returnMode = this.siteConfig.returnMode;
  readonly returnWindowDays = this.siteConfig.returnWindowDays;
}
