"""
Tests for ml-server/main.py

Focused on the PR change: both chat_endpoint and admin_analyze_endpoint
now call model.generate() without attention_mask and pad_token_id arguments.
"""
import sys
import types
import unittest
from unittest.mock import MagicMock, patch, call
import torch


# ---------------------------------------------------------------------------
# Stub out local modules that import heavy ML dependencies at import time
# so that importing main.py doesn't try to load real models.
# ---------------------------------------------------------------------------

def _make_stub_module(name):
    mod = types.ModuleType(name)
    return mod


# Stub tts_engine module
_tts_stub = _make_stub_module("tts_engine")
_tts_stub.TTSEngine = MagicMock(return_value=MagicMock())
sys.modules.setdefault("tts_engine", _tts_stub)

# Stub translation module
_trans_stub = _make_stub_module("translation")
_trans_stub.Translator = MagicMock(return_value=MagicMock())
sys.modules.setdefault("translation", _trans_stub)

# Stub peft so PeftModel import succeeds without the library installed
_peft_stub = _make_stub_module("peft")
_peft_stub.PeftModel = MagicMock()
sys.modules.setdefault("peft", _peft_stub)

# Stub transformers
_transformers_stub = _make_stub_module("transformers")
_transformers_stub.AutoModelForCausalLM = MagicMock()
_transformers_stub.AutoTokenizer = MagicMock()
sys.modules.setdefault("transformers", _transformers_stub)

# Stub torch
if "torch" not in sys.modules:
    _torch_stub = _make_stub_module("torch")
    _torch_stub.float16 = "float16"
    sys.modules["torch"] = _torch_stub

import main  # noqa: E402  – import after stubs are in place
from fastapi.testclient import TestClient


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_mock_model():
    """Return a mock model whose generate() yields a simple tensor."""
    mock_model = MagicMock()
    mock_model.device = "cpu"
    # generate returns a list/tensor that the post-processing loop can consume
    mock_model.generate.return_value = torch.tensor([[1, 2, 3, 4, 5]])
    return mock_model


def _make_mock_tokenizer():
    """Return a mock tokenizer that behaves like the real one."""
    mock_tok = MagicMock()
    mock_tok.eos_token_id = 0
    mock_tok.pad_token = None

    # apply_chat_template returns a plain string
    mock_tok.apply_chat_template.return_value = "<chat_template_output>"

    # __call__ (tokenizer([text], ...)) returns an object with input_ids
    encoded = MagicMock()
    encoded.input_ids = torch.tensor([[1, 2, 3]])
    encoded.attention_mask = torch.tensor([[1, 1, 1]])
    # Support .to(device)
    encoded.to = MagicMock(return_value=encoded)
    mock_tok.return_value = encoded

    # batch_decode returns a list of strings
    mock_tok.batch_decode.return_value = ["Mocked response text"]

    return mock_tok


# ---------------------------------------------------------------------------
# Test cases
# ---------------------------------------------------------------------------

class TestChatEndpointGenerateSignature(unittest.TestCase):
    """
    Verify that /api/chat calls model.generate() with the correct arguments
    after the PR change (attention_mask and pad_token_id removed).
    """

    def setUp(self):
        self.mock_model = _make_mock_model()
        self.mock_tokenizer = _make_mock_tokenizer()
        main.model = self.mock_model
        main.tokenizer = self.mock_tokenizer
        self.client = TestClient(main.app)

    def tearDown(self):
        main.model = None
        main.tokenizer = None

    def _post_chat(self, messages=None, max_tokens=256, temperature=0.7):
        payload = {
            "messages": messages or [{"role": "user", "content": "I have a headache."}],
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        return self.client.post("/api/chat", json=payload)

    # --- generate() signature tests ---

    def test_generate_called_without_attention_mask(self):
        """model.generate() must NOT receive an attention_mask kwarg."""
        self._post_chat()
        _, kwargs = self.mock_model.generate.call_args
        self.assertNotIn(
            "attention_mask", kwargs,
            "attention_mask should have been removed from model.generate() in the PR",
        )

    def test_generate_called_without_pad_token_id(self):
        """model.generate() must NOT receive a pad_token_id kwarg."""
        self._post_chat()
        _, kwargs = self.mock_model.generate.call_args
        self.assertNotIn(
            "pad_token_id", kwargs,
            "pad_token_id should have been removed from model.generate() in the PR",
        )

    def test_generate_called_with_input_ids(self):
        """model.generate() must receive inputs.input_ids as positional arg."""
        self._post_chat()
        args, _ = self.mock_model.generate.call_args
        self.assertTrue(len(args) >= 1, "input_ids should be the first positional argument")

    def test_generate_called_with_max_new_tokens(self):
        """model.generate() must receive max_new_tokens from the request."""
        self._post_chat(max_tokens=128)
        _, kwargs = self.mock_model.generate.call_args
        self.assertEqual(kwargs.get("max_new_tokens"), 128)

    def test_generate_called_with_temperature(self):
        """model.generate() must receive temperature from the request."""
        self._post_chat(temperature=0.9)
        _, kwargs = self.mock_model.generate.call_args
        self.assertEqual(kwargs.get("temperature"), 0.9)

    def test_generate_called_with_do_sample_true(self):
        """model.generate() must receive do_sample=True."""
        self._post_chat()
        _, kwargs = self.mock_model.generate.call_args
        self.assertTrue(kwargs.get("do_sample"))

    # --- response / status tests ---

    def test_successful_response_returns_200(self):
        response = self._post_chat()
        self.assertEqual(response.status_code, 200)

    def test_successful_response_contains_response_key(self):
        response = self._post_chat()
        self.assertIn("response", response.json())

    def test_successful_response_body(self):
        response = self._post_chat()
        self.assertEqual(response.json()["response"], "Mocked response text")

    def test_model_not_loaded_returns_503(self):
        main.model = None
        response = self._post_chat()
        self.assertEqual(response.status_code, 503)

    def test_model_not_loaded_error_message(self):
        main.model = None
        response = self._post_chat()
        self.assertIn("not loaded", response.json()["detail"].lower())

    def test_generate_exception_returns_500(self):
        self.mock_model.generate.side_effect = RuntimeError("CUDA OOM")
        response = self._post_chat()
        self.assertEqual(response.status_code, 500)

    def test_generate_exception_detail_in_response(self):
        self.mock_model.generate.side_effect = RuntimeError("CUDA OOM")
        response = self._post_chat()
        self.assertIn("CUDA OOM", response.json()["detail"])

    # --- system prompt injection ---

    def test_system_prompt_prepended_when_absent(self):
        """If messages do not start with 'system', a system prompt must be prepended."""
        self._post_chat(messages=[{"role": "user", "content": "Hello"}])
        call_args = self.mock_tokenizer.apply_chat_template.call_args
        messages_passed = call_args[0][0]
        self.assertEqual(messages_passed[0]["role"], "system")

    def test_system_prompt_not_duplicated_when_present(self):
        """If messages already start with a 'system' role, it must not be prepended again."""
        custom_system = {"role": "system", "content": "Custom system prompt."}
        user_msg = {"role": "user", "content": "Tell me about Ayurveda."}
        self._post_chat(messages=[custom_system, user_msg])
        call_args = self.mock_tokenizer.apply_chat_template.call_args
        messages_passed = call_args[0][0]
        # Count system messages
        system_msgs = [m for m in messages_passed if m["role"] == "system"]
        self.assertEqual(len(system_msgs), 1)

    # --- default parameter values ---

    def test_default_max_tokens_is_512(self):
        payload = {"messages": [{"role": "user", "content": "Hi"}]}
        self.client.post("/api/chat", json=payload)
        _, kwargs = self.mock_model.generate.call_args
        self.assertEqual(kwargs.get("max_new_tokens"), 512)

    def test_default_temperature_is_0_7(self):
        payload = {"messages": [{"role": "user", "content": "Hi"}]}
        self.client.post("/api/chat", json=payload)
        _, kwargs = self.mock_model.generate.call_args
        self.assertAlmostEqual(kwargs.get("temperature"), 0.7)


class TestAdminAnalyzeEndpointGenerateSignature(unittest.TestCase):
    """
    Verify that /api/admin/analyze calls model.generate() correctly
    after the PR change (attention_mask and pad_token_id removed).
    """

    def setUp(self):
        self.mock_model = _make_mock_model()
        self.mock_tokenizer = _make_mock_tokenizer()
        main.model = self.mock_model
        main.tokenizer = self.mock_tokenizer
        self.client = TestClient(main.app)

    def tearDown(self):
        main.model = None
        main.tokenizer = None

    def _post_analyze(self, query="Any anomalies?", context_data=None, max_tokens=256):
        payload = {
            "query": query,
            "context_data": context_data or {"logs": ["entry1", "entry2"], "stats": {"users": 5}},
            "max_tokens": max_tokens,
        }
        return self.client.post("/api/admin/analyze", json=payload)

    # --- generate() signature tests ---

    def test_generate_called_without_attention_mask(self):
        """model.generate() must NOT receive an attention_mask kwarg."""
        self._post_analyze()
        _, kwargs = self.mock_model.generate.call_args
        self.assertNotIn(
            "attention_mask", kwargs,
            "attention_mask should have been removed from model.generate() in the PR",
        )

    def test_generate_called_without_pad_token_id(self):
        """model.generate() must NOT receive a pad_token_id kwarg."""
        self._post_analyze()
        _, kwargs = self.mock_model.generate.call_args
        self.assertNotIn(
            "pad_token_id", kwargs,
            "pad_token_id should have been removed from model.generate() in the PR",
        )

    def test_generate_called_with_input_ids(self):
        self._post_analyze()
        args, _ = self.mock_model.generate.call_args
        self.assertTrue(len(args) >= 1)

    def test_generate_called_with_max_new_tokens(self):
        self._post_analyze(max_tokens=64)
        _, kwargs = self.mock_model.generate.call_args
        self.assertEqual(kwargs.get("max_new_tokens"), 64)

    def test_generate_called_with_fixed_temperature_0_5(self):
        """Admin endpoint must always use temperature=0.5 (analytical tasks)."""
        self._post_analyze()
        _, kwargs = self.mock_model.generate.call_args
        self.assertAlmostEqual(
            kwargs.get("temperature"), 0.5,
            msg="Admin analyze endpoint should use fixed temperature=0.5",
        )

    def test_generate_called_with_do_sample_true(self):
        self._post_analyze()
        _, kwargs = self.mock_model.generate.call_args
        self.assertTrue(kwargs.get("do_sample"))

    # --- response / status tests ---

    def test_successful_response_returns_200(self):
        response = self._post_analyze()
        self.assertEqual(response.status_code, 200)

    def test_successful_response_contains_response_key(self):
        response = self._post_analyze()
        self.assertIn("response", response.json())

    def test_successful_response_body(self):
        response = self._post_analyze()
        self.assertEqual(response.json()["response"], "Mocked response text")

    def test_model_not_loaded_returns_503(self):
        main.model = None
        response = self._post_analyze()
        self.assertEqual(response.status_code, 503)

    def test_model_not_loaded_error_message(self):
        main.model = None
        response = self._post_analyze()
        self.assertIn("not loaded", response.json()["detail"].lower())

    def test_generate_exception_returns_500(self):
        self.mock_model.generate.side_effect = RuntimeError("out of memory")
        response = self._post_analyze()
        self.assertEqual(response.status_code, 500)

    def test_generate_exception_detail_in_response(self):
        self.mock_model.generate.side_effect = RuntimeError("out of memory")
        response = self._post_analyze()
        self.assertIn("out of memory", response.json()["detail"])

    # --- context / message construction ---

    def test_context_data_included_in_messages(self):
        """Context data must be embedded in the user message sent to the model."""
        self._post_analyze(query="Find anomalies", context_data={"key": "val"})
        call_args = self.mock_tokenizer.apply_chat_template.call_args
        messages_passed = call_args[0][0]
        user_msgs = [m for m in messages_passed if m["role"] == "user"]
        self.assertTrue(any("key" in m["content"] for m in user_msgs))

    def test_query_included_in_messages(self):
        """The user query must appear in the messages passed to the tokenizer."""
        self._post_analyze(query="Unique query string XYZ")
        call_args = self.mock_tokenizer.apply_chat_template.call_args
        messages_passed = call_args[0][0]
        user_msgs = [m for m in messages_passed if m["role"] == "user"]
        self.assertTrue(any("Unique query string XYZ" in m["content"] for m in user_msgs))

    def test_system_prompt_always_present(self):
        """Admin analyze must always prepend an admin-role system prompt."""
        self._post_analyze()
        call_args = self.mock_tokenizer.apply_chat_template.call_args
        messages_passed = call_args[0][0]
        self.assertEqual(messages_passed[0]["role"], "system")

    # --- default parameter value ---

    def test_default_max_tokens_is_512(self):
        payload = {"query": "stats?", "context_data": {}}
        self.client.post("/api/admin/analyze", json=payload)
        _, kwargs = self.mock_model.generate.call_args
        self.assertEqual(kwargs.get("max_new_tokens"), 512)


class TestGenerateSignatureConsistency(unittest.TestCase):
    """
    Cross-endpoint regression tests: both endpoints must share the same
    stripped-down model.generate() signature introduced by the PR.
    """

    def setUp(self):
        self.mock_model = _make_mock_model()
        self.mock_tokenizer = _make_mock_tokenizer()
        main.model = self.mock_model
        main.tokenizer = self.mock_tokenizer
        self.client = TestClient(main.app)

    def tearDown(self):
        main.model = None
        main.tokenizer = None

    def _collect_generate_kwargs(self, endpoint, payload):
        self.mock_model.generate.reset_mock()
        self.client.post(endpoint, json=payload)
        _, kwargs = self.mock_model.generate.call_args
        return kwargs

    def test_neither_endpoint_passes_attention_mask(self):
        chat_kwargs = self._collect_generate_kwargs(
            "/api/chat",
            {"messages": [{"role": "user", "content": "test"}]},
        )
        admin_kwargs = self._collect_generate_kwargs(
            "/api/admin/analyze",
            {"query": "test", "context_data": {}},
        )
        self.assertNotIn("attention_mask", chat_kwargs)
        self.assertNotIn("attention_mask", admin_kwargs)

    def test_neither_endpoint_passes_pad_token_id(self):
        chat_kwargs = self._collect_generate_kwargs(
            "/api/chat",
            {"messages": [{"role": "user", "content": "test"}]},
        )
        admin_kwargs = self._collect_generate_kwargs(
            "/api/admin/analyze",
            {"query": "test", "context_data": {}},
        )
        self.assertNotIn("pad_token_id", chat_kwargs)
        self.assertNotIn("pad_token_id", admin_kwargs)

    def test_both_endpoints_pass_do_sample_true(self):
        chat_kwargs = self._collect_generate_kwargs(
            "/api/chat",
            {"messages": [{"role": "user", "content": "test"}]},
        )
        admin_kwargs = self._collect_generate_kwargs(
            "/api/admin/analyze",
            {"query": "test", "context_data": {}},
        )
        self.assertTrue(chat_kwargs.get("do_sample"))
        self.assertTrue(admin_kwargs.get("do_sample"))

    def test_admin_uses_lower_temperature_than_chat_default(self):
        """Admin endpoint uses 0.5; chat default is 0.7 — admin should be lower."""
        chat_kwargs = self._collect_generate_kwargs(
            "/api/chat",
            {"messages": [{"role": "user", "content": "test"}]},
        )
        admin_kwargs = self._collect_generate_kwargs(
            "/api/admin/analyze",
            {"query": "test", "context_data": {}},
        )
        self.assertLess(admin_kwargs.get("temperature"), chat_kwargs.get("temperature"))


if __name__ == "__main__":
    unittest.main()
