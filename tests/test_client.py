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


@pytest.mark.parametrize('name', [name for name, item in OPERATIONS.items() if item.get('fileUpload')])
def test_file_upload_request_sequence(name, tmp_path):
    """Exercise upload/attachment mechanics against local synthetic transports."""
    from urllib.parse import urlsplit
    from unittest.mock import patch
    workflow = OPERATIONS[name]['fileUpload']
    original = {workflow['inputVariable']: {}}
    receipt = tmp_path / 'synthetic-receipt.pdf'
    receipt.write_bytes(b'%PDF-1.7\nsynthetic test bytes')
    calls = []
    signed_id = 'synthetic-signed-blob'
    def metadata_response(request):
        calls.append('metadata')
        assert str(request.url) == workflow['metadataEndpoint']
        blob = json.loads(request.content)['blob']
        endpoint = urlsplit(workflow['metadataEndpoint'])
        storage = endpoint.scheme + '://' + endpoint.netloc + '/synthetic-storage?signature=synthetic'
        return httpx.Response(200, json={**blob, 'signed_id': signed_id,
            'direct_upload': {'url': storage, 'headers': {'Content-Type': blob['content_type'], 'Content-MD5': blob['checksum']}}})
    def storage_response(request):
        calls.append('storage')
        assert request.content == receipt.read_bytes()
        assert 'cookie' not in request.headers and 'authorization' not in request.headers
        return httpx.Response(200)
    def mutation_response(request):
        calls.append('mutation')
        payload = json.loads(request.content)
        assert payload['variables'][workflow['inputVariable']][workflow['attachmentField']] == signed_id
        return httpx.Response(200, json={'data': {'created': {'id': 'synthetic-record'}}})
    with httpx.Client(transport=httpx.MockTransport(metadata_response)) as app, \
         httpx.Client(transport=httpx.MockTransport(storage_response)) as storage, \
         httpx.Client(transport=httpx.MockTransport(mutation_response)) as api:
        with Client(workflow['apiEndpoint'], http_client=api, allow_writes=True) as client:
            method = getattr(client, OPERATIONS[name]['method'] + '_with_file')
            # These checks exercise transport and sequencing, not server-specific
            # custom input validation, which needs a schema or live verification.
            with patch('gusto_client.operation_contracts.validate_variables', side_effect=lambda op, args: args), \
                 patch('gusto_client.operation_runtime.validate_variables', side_effect=lambda op, args: args):
                result = method(receipt_path=receipt, metadata_client=app, storage_client=storage, **original)
    assert calls == ['metadata', 'storage', 'mutation']
    assert result == {'created': {'id': 'synthetic-record'}}
    assert original == {workflow['inputVariable']: {}}
