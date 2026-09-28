import { Injectable } from '@nestjs/common';
import { OfferwallExternal } from '../../external/offerwall.external';
import { OfferwallPartnersService } from './offerwall-partners.service';

const USER_ID_MACRO = '{USER_ID}';

export interface OfferwallListRow {
  cz_offerwall_partner_id: string;
  name: string;
  logo_url: string | null;
  description: string | null;
  badge_label: string | null;
  rank: number;
  offer_url: string;
}

@Injectable()
export class OfferwallService {
  constructor(
    private readonly partnersService: OfferwallPartnersService,
    private readonly offerwallExternal: OfferwallExternal,
  ) {}

  /**
   * Active partners ranked highest first, each with this user's id already in its URL.
   * A partner whose URL has no {USER_ID} is skipped: it could not open, or could never credit the user.
   */
  async listForUser(user_id: string): Promise<{ data: OfferwallListRow[]; total: number }> {
    const partners = await this.partnersService.listActive();
    const data = partners.filter((partner) => partner.click_url_template.includes(USER_ID_MACRO)).map((partner) => ({
      cz_offerwall_partner_id: partner.cz_offerwall_partner_id,
      name: partner.name,
      logo_url: partner.logo_url,
      description: partner.description,
      badge_label: partner.badge_label,
      rank: partner.rank,
      offer_url: this.offerwallExternal.buildClickUrl(partner.click_url_template, {
        USER_ID: user_id,
      }),
    }));
    return { data, total: data.length };
  }
}
