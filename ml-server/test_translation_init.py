import sys
import unittest
from unittest.mock import MagicMock
import importlib


class TestTranslationInitialization(unittest.TestCase):
    def test_default_init_with_cuda(self):
        """Test Translator initialization defaults when CUDA is available."""
        mock_torch = MagicMock()
        mock_torch.cuda.is_available.return_value = True
        sys.modules["torch"] = mock_torch
        sys.modules["transformers"] = MagicMock()

        if "translation" in sys.modules:
            importlib.reload(sys.modules["translation"])
        import translation

        translator = translation.Translator()

        self.assertEqual(translator.model_name, "facebook/nllb-200-distilled-600M")
        self.assertEqual(translator.device, "cuda")
        self.assertIsNone(translator.model)
        self.assertIsNone(translator.tokenizer)
        self.assertIn("en", translator.lang_map)
        self.assertEqual(translator.lang_map["en"], "eng_Latn")

    def test_default_init_without_cuda(self):
        """Test Translator initialization defaults when CUDA is not available."""
        mock_torch = MagicMock()
        mock_torch.cuda.is_available.return_value = False
        sys.modules["torch"] = mock_torch
        sys.modules["transformers"] = MagicMock()

        if "translation" in sys.modules:
            importlib.reload(sys.modules["translation"])
        import translation

        translator = translation.Translator()

        self.assertEqual(translator.device, "cpu")

    def test_custom_init(self):
        """Test Translator initialization with custom parameters."""
        mock_torch = MagicMock()
        mock_torch.cuda.is_available.return_value = False
        sys.modules["torch"] = mock_torch
        sys.modules["transformers"] = MagicMock()

        if "translation" in sys.modules:
            importlib.reload(sys.modules["translation"])
        import translation

        custom_model = "test/model"
        custom_device = "mps"

        translator = translation.Translator(
            model_name=custom_model, device=custom_device
        )

        self.assertEqual(translator.model_name, custom_model)
        self.assertEqual(translator.device, custom_device)


if __name__ == "__main__":
    unittest.main()
