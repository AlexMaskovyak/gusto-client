"""Methods generated from captured operation documents."""

from typing import Any
from .operation_runtime import OperationClient, UNSET


class Client(OperationClient):
    """Call captured operations using the shared authenticated HTTP client.

    Use as a context manager. See OperationClient for connection ownership,
    authentication inputs and write permission. Operation methods document
    declared variables; they do not assert complete server API coverage.
    """

    def company_has_become_paying_customer(self, *, readBasicCompanyInfoPermission: Any) -> dict[str, Any]:
        """Run the GraphQL query CompanyHasBecomePayingCustomer.
        
        Args:
            readBasicCompanyInfoPermission: GraphQL $readBasicCompanyInfoPermission: Boolean!. Required.
        
        Returns:
            The response's data object as a JSON dictionary. Response fields and
            custom input fields are not validated without a server schema.
        
        Raises:
            ValueError: Declared variables are invalid or mutation permission is missing.
            OperationError: The server returns a non-success HTTP status.
            RuntimeError: The response is oversized, invalid JSON or contains GraphQL errors.
            httpx.HTTPError: The HTTP transport fails. Browser login can raise BrowserError.
        
        No automatic retry occurs. Check the service before retrying an uncertain write.
        """
        values = {'readBasicCompanyInfoPermission': readBasicCompanyInfoPermission}
        return self._execute('CompanyHasBecomePayingCustomer', {key: value for key, value in values.items() if value is not UNSET})

    def company_onboarding_and_from_direct_segment(self) -> dict[str, Any]:
        """Run the GraphQL query CompanyOnboardingAndFromDirectSegment.
        
        Returns:
            The response's data object as a JSON dictionary. Response fields and
            custom input fields are not validated without a server schema.
        
        Raises:
            ValueError: Declared variables are invalid or mutation permission is missing.
            OperationError: The server returns a non-success HTTP status.
            RuntimeError: The response is oversized, invalid JSON or contains GraphQL errors.
            httpx.HTTPError: The HTTP transport fails. Browser login can raise BrowserError.
        
        No automatic retry occurs. Check the service before retrying an uncertain write.
        """
        values = {}
        return self._execute('CompanyOnboardingAndFromDirectSegment', {key: value for key, value in values.items() if value is not UNSET})

    def create_member_expense(self, *, input: Any) -> dict[str, Any]:
        """Send the GraphQL mutation CreateMemberExpense.
        
        Requires a client constructed with allow_writes=True.
        
        Args:
            input: GraphQL $input: CreateMemberExpenseInput!. Required.
        
        Returns:
            The response's data object as a JSON dictionary. Response fields and
            custom input fields are not validated without a server schema.
        
        Raises:
            ValueError: Declared variables are invalid or mutation permission is missing.
            OperationError: The server returns a non-success HTTP status.
            RuntimeError: The response is oversized, invalid JSON or contains GraphQL errors.
            httpx.HTTPError: The HTTP transport fails. Browser login can raise BrowserError.
        
        No automatic retry occurs. Check the service before retrying an uncertain write.
        """
        values = {'input': input}
        return self._execute('CreateMemberExpense', {key: value for key, value in values.items() if value is not UNSET})

    def dashboard_apis_company_is_gus_enabled(self) -> dict[str, Any]:
        """Run the GraphQL query DashboardApisCompanyIsGusEnabled.
        
        Returns:
            The response's data object as a JSON dictionary. Response fields and
            custom input fields are not validated without a server schema.
        
        Raises:
            ValueError: Declared variables are invalid or mutation permission is missing.
            OperationError: The server returns a non-success HTTP status.
            RuntimeError: The response is oversized, invalid JSON or contains GraphQL errors.
            httpx.HTTPError: The HTTP transport fails. Browser login can raise BrowserError.
        
        No automatic retry occurs. Check the service before retrying an uncertain write.
        """
        values = {}
        return self._execute('DashboardApisCompanyIsGusEnabled', {key: value for key, value in values.items() if value is not UNSET})

    def dashboard_apis_use_current_company_subscriptions(self) -> dict[str, Any]:
        """Run the GraphQL query DashboardApisUseCurrentCompanySubscriptions.
        
        Returns:
            The response's data object as a JSON dictionary. Response fields and
            custom input fields are not validated without a server schema.
        
        Raises:
            ValueError: Declared variables are invalid or mutation permission is missing.
            OperationError: The server returns a non-success HTTP status.
            RuntimeError: The response is oversized, invalid JSON or contains GraphQL errors.
            httpx.HTTPError: The HTTP transport fails. Browser login can raise BrowserError.
        
        No automatic retry occurs. Check the service before retrying an uncertain write.
        """
        values = {}
        return self._execute('DashboardApisUseCurrentCompanySubscriptions', {key: value for key, value in values.items() if value is not UNSET})

    def firm_logo(self, *, isAccountant: Any) -> dict[str, Any]:
        """Run the GraphQL query FirmLogo.
        
        Args:
            isAccountant: GraphQL $isAccountant: Boolean!. Required.
        
        Returns:
            The response's data object as a JSON dictionary. Response fields and
            custom input fields are not validated without a server schema.
        
        Raises:
            ValueError: Declared variables are invalid or mutation permission is missing.
            OperationError: The server returns a non-success HTTP status.
            RuntimeError: The response is oversized, invalid JSON or contains GraphQL errors.
            httpx.HTTPError: The HTTP transport fails. Browser login can raise BrowserError.
        
        No automatic retry occurs. Check the service before retrying an uncertain write.
        """
        values = {'isAccountant': isAccountant}
        return self._execute('FirmLogo', {key: value for key, value in values.items() if value is not UNSET})

    def get_current_company_onboarding_experience_type(self) -> dict[str, Any]:
        """Run the GraphQL query GetCurrentCompanyOnboardingExperienceType.
        
        Returns:
            The response's data object as a JSON dictionary. Response fields and
            custom input fields are not validated without a server schema.
        
        Raises:
            ValueError: Declared variables are invalid or mutation permission is missing.
            OperationError: The server returns a non-success HTTP status.
            RuntimeError: The response is oversized, invalid JSON or contains GraphQL errors.
            httpx.HTTPError: The HTTP transport fails. Browser login can raise BrowserError.
        
        No automatic retry occurs. Check the service before retrying an uncertain write.
        """
        values = {}
        return self._execute('GetCurrentCompanyOnboardingExperienceType', {key: value for key, value in values.items() if value is not UNSET})

    def gusto_ffe(self, *, input: Any) -> dict[str, Any]:
        """Run the GraphQL query GustoFfe.
        
        Args:
            input: GraphQL $input: [GustoFfeFeatureInput!]!. Required.
        
        Returns:
            The response's data object as a JSON dictionary. Response fields and
            custom input fields are not validated without a server schema.
        
        Raises:
            ValueError: Declared variables are invalid or mutation permission is missing.
            OperationError: The server returns a non-success HTTP status.
            RuntimeError: The response is oversized, invalid JSON or contains GraphQL errors.
            httpx.HTTPError: The HTTP transport fails. Browser login can raise BrowserError.
        
        No automatic retry occurs. Check the service before retrying an uncertain write.
        """
        values = {'input': input}
        return self._execute('GustoFfe', {key: value for key, value in values.items() if value is not UNSET})

    def member_expenses(self, *, after: Any = UNSET, before: Any = UNSET, filter: Any = UNSET, first: Any = UNSET, includeVendors: Any = UNSET, last: Any = UNSET, order: Any = UNSET, search: Any = UNSET, teamExpenses: Any) -> dict[str, Any]:
        """Run the GraphQL query MemberExpenses.
        
        Args:
            after: GraphQL $after: String. Defaults to UNSET, leaving the variable for the server to resolve.
            before: GraphQL $before: String. Defaults to UNSET, leaving the variable for the server to resolve.
            filter: GraphQL $filter: ExpensesFilter. Defaults to UNSET, leaving the variable for the server to resolve.
            first: GraphQL $first: Int. Defaults to UNSET, leaving the variable for the server to resolve.
            includeVendors: GraphQL $includeVendors: Boolean. Defaults to UNSET, leaving the variable for the server to resolve.
            last: GraphQL $last: Int. Defaults to UNSET, leaving the variable for the server to resolve.
            order: GraphQL $order: String. Defaults to UNSET, leaving the variable for the server to resolve.
            search: GraphQL $search: String. Defaults to UNSET, leaving the variable for the server to resolve.
            teamExpenses: GraphQL $teamExpenses: Boolean!. Required.
        
        Returns:
            The response's data object as a JSON dictionary. Response fields and
            custom input fields are not validated without a server schema.
        
        Raises:
            ValueError: Declared variables are invalid or mutation permission is missing.
            OperationError: The server returns a non-success HTTP status.
            RuntimeError: The response is oversized, invalid JSON or contains GraphQL errors.
            httpx.HTTPError: The HTTP transport fails. Browser login can raise BrowserError.
        
        No automatic retry occurs. Check the service before retrying an uncertain write.
        """
        values = {'after': after, 'before': before, 'filter': filter, 'first': first, 'includeVendors': includeVendors, 'last': last, 'order': order, 'search': search, 'teamExpenses': teamExpenses}
        return self._execute('MemberExpenses', {key: value for key, value in values.items() if value is not UNSET})

    def mobile_app_growth_upsell(self) -> dict[str, Any]:
        """Run the GraphQL query MobileAppGrowthUpsell.
        
        Returns:
            The response's data object as a JSON dictionary. Response fields and
            custom input fields are not validated without a server schema.
        
        Raises:
            ValueError: Declared variables are invalid or mutation permission is missing.
            OperationError: The server returns a non-success HTTP status.
            RuntimeError: The response is oversized, invalid JSON or contains GraphQL errors.
            httpx.HTTPError: The HTTP transport fails. Browser login can raise BrowserError.
        
        No automatic retry occurs. Check the service before retrying an uncertain write.
        """
        values = {}
        return self._execute('MobileAppGrowthUpsell', {key: value for key, value in values.items() if value is not UNSET})

    def referrals_nav_link_container(self) -> dict[str, Any]:
        """Run the GraphQL query ReferralsNavLinkContainer.
        
        Returns:
            The response's data object as a JSON dictionary. Response fields and
            custom input fields are not validated without a server schema.
        
        Raises:
            ValueError: Declared variables are invalid or mutation permission is missing.
            OperationError: The server returns a non-success HTTP status.
            RuntimeError: The response is oversized, invalid JSON or contains GraphQL errors.
            httpx.HTTPError: The HTTP transport fails. Browser login can raise BrowserError.
        
        No automatic retry occurs. Check the service before retrying an uncertain write.
        """
        values = {}
        return self._execute('ReferralsNavLinkContainer', {key: value for key, value in values.items() if value is not UNSET})

    def support_page(self, *, canReadCompanyAddresses: Any, companyId: Any, featureFlagInputs: Any, isAccountant: Any, isPayrollAdmin: Any) -> dict[str, Any]:
        """Run the GraphQL query SupportPage.
        
        Args:
            canReadCompanyAddresses: GraphQL $canReadCompanyAddresses: Boolean!. Required.
            companyId: GraphQL $companyId: ID!. Required.
            featureFlagInputs: GraphQL $featureFlagInputs: [GustoFfeFeatureInput!]!. Required.
            isAccountant: GraphQL $isAccountant: Boolean!. Required.
            isPayrollAdmin: GraphQL $isPayrollAdmin: Boolean!. Required.
        
        Returns:
            The response's data object as a JSON dictionary. Response fields and
            custom input fields are not validated without a server schema.
        
        Raises:
            ValueError: Declared variables are invalid or mutation permission is missing.
            OperationError: The server returns a non-success HTTP status.
            RuntimeError: The response is oversized, invalid JSON or contains GraphQL errors.
            httpx.HTTPError: The HTTP transport fails. Browser login can raise BrowserError.
        
        No automatic retry occurs. Check the service before retrying an uncertain write.
        """
        values = {'canReadCompanyAddresses': canReadCompanyAddresses, 'companyId': companyId, 'featureFlagInputs': featureFlagInputs, 'isAccountant': isAccountant, 'isPayrollAdmin': isPayrollAdmin}
        return self._execute('SupportPage', {key: value for key, value in values.items() if value is not UNSET})

    def top_bar_company(self, *, isPayrollAdmin: Any) -> dict[str, Any]:
        """Run the GraphQL query TopBarCompany.
        
        Args:
            isPayrollAdmin: GraphQL $isPayrollAdmin: Boolean!. Required.
        
        Returns:
            The response's data object as a JSON dictionary. Response fields and
            custom input fields are not validated without a server schema.
        
        Raises:
            ValueError: Declared variables are invalid or mutation permission is missing.
            OperationError: The server returns a non-success HTTP status.
            RuntimeError: The response is oversized, invalid JSON or contains GraphQL errors.
            httpx.HTTPError: The HTTP transport fails. Browser login can raise BrowserError.
        
        No automatic retry occurs. Check the service before retrying an uncertain write.
        """
        values = {'isPayrollAdmin': isPayrollAdmin}
        return self._execute('TopBarCompany', {key: value for key, value in values.items() if value is not UNSET})

    def update_member_expense(self, *, input: Any) -> dict[str, Any]:
        """Send the GraphQL mutation UpdateMemberExpense.
        
        Requires a client constructed with allow_writes=True.
        
        Args:
            input: GraphQL $input: UpdateMemberExpenseInput!. Required.
        
        Returns:
            The response's data object as a JSON dictionary. Response fields and
            custom input fields are not validated without a server schema.
        
        Raises:
            ValueError: Declared variables are invalid or mutation permission is missing.
            OperationError: The server returns a non-success HTTP status.
            RuntimeError: The response is oversized, invalid JSON or contains GraphQL errors.
            httpx.HTTPError: The HTTP transport fails. Browser login can raise BrowserError.
        
        No automatic retry occurs. Check the service before retrying an uncertain write.
        """
        values = {'input': input}
        return self._execute('UpdateMemberExpense', {key: value for key, value in values.items() if value is not UNSET})

    def use_admin_override_redirect(self) -> dict[str, Any]:
        """Run the GraphQL query UseAdminOverrideRedirect.
        
        Returns:
            The response's data object as a JSON dictionary. Response fields and
            custom input fields are not validated without a server schema.
        
        Raises:
            ValueError: Declared variables are invalid or mutation permission is missing.
            OperationError: The server returns a non-success HTTP status.
            RuntimeError: The response is oversized, invalid JSON or contains GraphQL errors.
            httpx.HTTPError: The HTTP transport fails. Browser login can raise BrowserError.
        
        No automatic retry occurs. Check the service before retrying an uncertain write.
        """
        values = {}
        return self._execute('UseAdminOverrideRedirect', {key: value for key, value in values.items() if value is not UNSET})

    def create_member_expense_with_file(self, *, receipt_path, metadata_client=None, storage_client=None, **arguments):
        """Upload a file and call CreateMemberExpense once with its discovered attachment field.

        Requires allow_writes=True. arguments are the original operation variables.
        metadata_client authenticates the application upload endpoint. Storage must
        be credential-free. No stage retries; check the service after an uncertain
        failure before submitting again. See upload_runtime.submit_with_file.
        """
        from .upload_runtime import submit_with_file
        return submit_with_file(self, 'CreateMemberExpense', arguments, {'operation': 'CreateMemberExpense', 'apiEndpoint': 'https://graphql.app.gusto.com/', 'metadataEndpoint': 'https://app.gusto.com/rails/active_storage/direct_uploads', 'inputVariable': 'input', 'attachmentField': 'fileId', 'evidence': ['55af6d22b17379618a488095ac0e1eac28814b78616ba976eb515ee11b90ada0', '63fbab8e2d410848f4fa7336a6acc36063f703e1a51535308a54ee93834daaf5', 'b31bdc441ce1f6ed963412b8c2a255e78d59e9bae575e492a9845a1361980796'], 'protocol': 'rails-active-storage-v1', 'maxBytes': 15000000}, receipt_path,
                                metadata_client=metadata_client, storage_client=storage_client)


    def update_member_expense_with_file(self, *, receipt_path, metadata_client=None, storage_client=None, **arguments):
        """Upload a file and call UpdateMemberExpense once with its discovered attachment field.

        Requires allow_writes=True. arguments are the original operation variables.
        metadata_client authenticates the application upload endpoint. Storage must
        be credential-free. No stage retries; check the service after an uncertain
        failure before submitting again. See upload_runtime.submit_with_file.
        """
        from .upload_runtime import submit_with_file
        return submit_with_file(self, 'UpdateMemberExpense', arguments, {'operation': 'UpdateMemberExpense', 'apiEndpoint': 'https://graphql.app.gusto.com/', 'metadataEndpoint': 'https://app.gusto.com/rails/active_storage/direct_uploads', 'inputVariable': 'input', 'attachmentField': 'fileId', 'evidence': ['55af6d22b17379618a488095ac0e1eac28814b78616ba976eb515ee11b90ada0', '63fbab8e2d410848f4fa7336a6acc36063f703e1a51535308a54ee93834daaf5', 'b31bdc441ce1f6ed963412b8c2a255e78d59e9bae575e492a9845a1361980796'], 'protocol': 'rails-active-storage-v1', 'maxBytes': 15000000}, receipt_path,
                                metadata_client=metadata_client, storage_client=storage_client)
