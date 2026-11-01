"""Generated checks use synthetic responses and never call the service."""
import inspect
import json
from importlib.resources import files
import httpx
import pytest
from gusto_client import Client

OPERATIONS = json.loads(files('gusto_client').joinpath('_operations.json').read_text())

@pytest.mark.parametrize('name', sorted(OPERATIONS))
def test_documented_method(name):
    """Every source operation has an inspectable, documented Python method."""
    assert inspect.getdoc(getattr(Client, OPERATIONS[name]['method']))

def test_all_operation_requests_and_write_guards():
    """Exercise request construction without a server or schema-specific fixture values."""
    calls = []
    def response(request):
        calls.append(request)
        return httpx.Response(200, json={'data': {'synthetic': True}})
    with httpx.Client(transport=httpx.MockTransport(response)) as http:
        with Client('https://example.test/graphql', http_client=http, allow_writes=True) as client:
            for name, bound in client._operations.items():
                # Request mechanics are independent of server-specific input shapes.
                # Variable validation has its own generator tests, so patch only that
                # step to exercise every captured operation without invented inputs.
                from unittest.mock import patch
                with patch('gusto_client.operation_runtime.validate_variables', return_value={}):
                    assert client._execute(name, {}) == {'synthetic': True}
                    assert calls[-1].method == bound.method
                    payload = json.loads(calls[-1].content) if bound.method == 'POST' else dict(calls[-1].url.params)
                    assert payload['operationName'] == name
        with Client('https://example.test/graphql', http_client=http) as client:
            for name, bound in client._operations.items():
                if bound.operation.write:
                    from unittest.mock import patch
                    before = len(calls)
                    with patch('gusto_client.operation_runtime.validate_variables', return_value={}):
                        with pytest.raises(ValueError, match='allow_writes'):
                            client._execute(name, {})
                    assert len(calls) == before
