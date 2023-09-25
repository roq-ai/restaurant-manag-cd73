interface AppConfigInterface {
  ownerRoles: string[];
  customerRoles: string[];
  tenantRoles: string[];
  tenantName: string;
  applicationName: string;
  addOns: string[];
  ownerAbilities: string[];
  customerAbilities: string[];
  getQuoteUrl: string;
}
export const appConfig: AppConfigInterface = {
  ownerRoles: ['Owner'],
  customerRoles: ['Guest'],
  tenantRoles: ['Owner', 'Manager'],
  tenantName: 'Restaurant',
  applicationName: 'Restaurant management software',
  addOns: ['file upload', 'chat', 'notifications', 'file'],
  customerAbilities: ['Read restaurant information', 'Read menus', 'Read restaurant reviews', 'View orders'],
  ownerAbilities: [
    'Manage users',
    'Manage restaurants',
    'Manage menus',
    'Manage reservations',
    'Manage reviews',
    'Manage orders',
  ],
  getQuoteUrl: 'https://app.roq.ai/proposal/c3b9ee4b-960c-4210-8a3a-ad797371d3bd',
};
