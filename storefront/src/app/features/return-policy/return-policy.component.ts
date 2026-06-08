import { Component, inject, OnInit } from '@angular/core';
import { SiteConfigService } from '../../core/services/site-config.service';

@Component({
  selector: 'app-return-policy',
  standalone: true,
  templateUrl: './return-policy.component.html',
  styleUrl: './return-policy.component.scss',
})
export class ReturnPolicyComponent implements OnInit {
  private readonly siteConfig = inject(SiteConfigService);

  readonly returnWindowDays = this.siteConfig.returnWindowDays;
  readonly returnEnabled = this.siteConfig.returnEnabled;

  ngOnInit(): void {
    this.siteConfig.load();
  }
}
