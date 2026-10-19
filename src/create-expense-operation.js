// Generated from inspected frontend operation definitions.
export default Object.freeze({
  "endpoint": "https://graphql.app.gusto.com/?operationName=CreateMemberExpense",
  "operationName": "CreateMemberExpense",
  "kind": "mutation",
  "query": "mutation CreateMemberExpense($input: CreateMemberExpenseInput!) {\n  payload: createMemberExpense(input: $input) {\n    errors {\n      argument\n      message\n    }\n    oneTimeReimbursement {\n      ...TeamExpense\n    }\n  }\n}\n\nfragment TeamExpense on OneTimeReimbursement {\n  availableActions\n  ...Expense\n}\n\nfragment Expense on OneTimeReimbursement {\n  id\n  amount\n  approvedBy\n  categoryName\n  categoryUuid\n  checkDate\n  createdAt\n  currency\n  description\n  displayName\n  eorOneTimeReimbursement {\n    id\n    category\n    title\n  }\n  member {\n    id\n    latestEmployment {\n      id\n      isEor\n      workerType\n    }\n    preferredFullName\n  }\n  purchaseDate\n  rateData {\n    amount\n    categoryRateUuid\n    name\n    rateBaseKind\n    rateConversionAmount\n  }\n  receipt {\n    id\n    contentType\n    name\n    url\n  }\n  status\n  statusReason\n  vendor {\n    id\n    name\n  }\n}"
});
