import json
import subprocess
import sys
from pathlib import Path

import httpx
import pytest

from gusto_client import Client
from gusto_client.operation_runtime import validate_arguments


def test_zero_input_operations_and_declared_variables_validate():
    assert validate_arguments('gusto_client', 'ReimbursementOptions', {}) == {}
    assert validate_arguments('gusto_client', 'MemberExpenses', {'first': 100}) == {'first': 100}
    with pytest.raises(ValueError):
        validate_arguments('gusto_client', 'MemberExpenses', {'first': 2**40})


def test_reads_use_generated_documents_and_observed_request_urls():
    calls = []
    def response(request):
        calls.append(request)
        return httpx.Response(200, json={'data': {'member': {'id': 'example-member'}}})
    with httpx.Client(transport=httpx.MockTransport(response)) as http:
        with Client('https://graphql.app.gusto.com/', http_client=http) as client:
            assert client.reimbursement_options() == {'member': {'id': 'example-member'}}
            client.member_expenses(first=100)
    assert len(calls) == 2
    assert calls[0].url.params['operationName'] == 'ReimbursementOptions'
    payload = json.loads(calls[1].content)
    assert payload['operationName'] == 'MemberExpenses'
    assert payload['variables'] == {'first': 100}
    assert 'query MemberExpenses' in payload['query']


def test_mutations_require_explicit_library_permission_and_do_not_retry():
    calls = []
    def response(request):
        calls.append(request)
        return httpx.Response(200, json={'data': {'createMemberExpense': {'id': 'example-expense'}}})
    with httpx.Client(transport=httpx.MockTransport(response)) as http:
        with Client('https://graphql.app.gusto.com/', http_client=http) as client:
            with pytest.raises(ValueError, match='allow_writes'):
                client.create_member_expense(input={'example': 'input'})
        assert not calls
        with Client('https://graphql.app.gusto.com/', http_client=http, allow_writes=True) as client:
            client.create_member_expense(input={'example': 'input'})
    assert len(calls) == 1
    assert json.loads(calls[0].content)['operationName'] == 'CreateMemberExpense'


def test_installed_command_help_and_write_guard():
    result = subprocess.run([sys.executable, '-m', 'gusto_client._cli', 'MemberExpenses', '--help'], capture_output=True, text=True)
    assert result.returncode == 0
    assert 'first: Int' in ' '.join(result.stdout.split())
    result = subprocess.run([sys.executable, '-m', 'gusto_client._cli', 'CreateMemberExpense', '--url', 'https://graphql.app.gusto.com/'], capture_output=True, text=True)
    assert result.returncode != 0 and '--confirm-write CreateMemberExpense' in result.stderr


def test_generation_report_contains_no_private_capture_lineage():
    report = json.loads((Path(__file__).parents[1] / 'generation.json').read_text())
    assert report['generationMode'] == 'operation-documents'
    assert report['schemaValidated'] is False
    assert report['liveVerified'] is False
    assert 'lineage' not in report
    assert len(report['operations']) == 16
