"""Methods generated from captured operation documents."""

from typing import Any
from .operation_runtime import OperationClient, UNSET


class Client(OperationClient):
    def cofounder_announcement_bar_current_user_role(self) -> dict[str, Any]:
        values = {}
        return self._execute('CofounderAnnouncementBarCurrentUserRole', {key: value for key, value in values.items() if value is not UNSET})

    def company_has_become_paying_customer(self, *, readBasicCompanyInfoPermission: Any) -> dict[str, Any]:
        values = {'readBasicCompanyInfoPermission': readBasicCompanyInfoPermission}
        return self._execute('CompanyHasBecomePayingCustomer', {key: value for key, value in values.items() if value is not UNSET})

    def company_onboarding_and_from_direct_segment(self) -> dict[str, Any]:
        values = {}
        return self._execute('CompanyOnboardingAndFromDirectSegment', {key: value for key, value in values.items() if value is not UNSET})

    def create_member_expense(self, *, input: Any) -> dict[str, Any]:
        values = {'input': input}
        return self._execute('CreateMemberExpense', {key: value for key, value in values.items() if value is not UNSET})

    def dashboard_apis_company_is_gus_enabled(self) -> dict[str, Any]:
        values = {}
        return self._execute('DashboardApisCompanyIsGusEnabled', {key: value for key, value in values.items() if value is not UNSET})

    def dashboard_apis_use_current_company_subscriptions(self) -> dict[str, Any]:
        values = {}
        return self._execute('DashboardApisUseCurrentCompanySubscriptions', {key: value for key, value in values.items() if value is not UNSET})

    def firm_logo(self, *, isAccountant: Any) -> dict[str, Any]:
        values = {'isAccountant': isAccountant}
        return self._execute('FirmLogo', {key: value for key, value in values.items() if value is not UNSET})

    def get_current_company_onboarding_experience_type(self) -> dict[str, Any]:
        values = {}
        return self._execute('GetCurrentCompanyOnboardingExperienceType', {key: value for key, value in values.items() if value is not UNSET})

    def gusto_ffe(self, *, input: Any) -> dict[str, Any]:
        values = {'input': input}
        return self._execute('GustoFfe', {key: value for key, value in values.items() if value is not UNSET})

    def member_expenses(self, *, after: Any = UNSET, first: Any = UNSET) -> dict[str, Any]:
        values = {'after': after, 'first': first}
        return self._execute('MemberExpenses', {key: value for key, value in values.items() if value is not UNSET})

    def mobile_app_growth_upsell(self) -> dict[str, Any]:
        values = {}
        return self._execute('MobileAppGrowthUpsell', {key: value for key, value in values.items() if value is not UNSET})

    def referrals_nav_link_container(self) -> dict[str, Any]:
        values = {}
        return self._execute('ReferralsNavLinkContainer', {key: value for key, value in values.items() if value is not UNSET})

    def reimbursement_options(self) -> dict[str, Any]:
        values = {}
        return self._execute('ReimbursementOptions', {key: value for key, value in values.items() if value is not UNSET})

    def support_page(self, *, canReadCompanyAddresses: Any, companyId: Any, featureFlagInputs: Any, isAccountant: Any, isPayrollAdmin: Any) -> dict[str, Any]:
        values = {'canReadCompanyAddresses': canReadCompanyAddresses, 'companyId': companyId, 'featureFlagInputs': featureFlagInputs, 'isAccountant': isAccountant, 'isPayrollAdmin': isPayrollAdmin}
        return self._execute('SupportPage', {key: value for key, value in values.items() if value is not UNSET})

    def top_bar_company(self, *, isPayrollAdmin: Any) -> dict[str, Any]:
        values = {'isPayrollAdmin': isPayrollAdmin}
        return self._execute('TopBarCompany', {key: value for key, value in values.items() if value is not UNSET})

    def use_admin_override_redirect(self) -> dict[str, Any]:
        values = {}
        return self._execute('UseAdminOverrideRedirect', {key: value for key, value in values.items() if value is not UNSET})
