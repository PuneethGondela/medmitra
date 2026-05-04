import sys
import os
import unittest
from unittest.mock import MagicMock, patch
import importlib

# Add ml-server to sys.path so 'translation' can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))


class TestTranslationLoadModel(unittest.TestCase):
    def setUp(self):
        # Mock torch
        self.mock_torch = MagicMock()
        self.mock_torch.cuda.is_available.return_value = False
        sys.modules["torch"] = self.mock_torch

        # Mock transformers
        self.mock_transformers = MagicMock()

        # We need AutoTokenizer and AutoModelForSeq2SeqLM
        self.mock_tokenizer_cls = MagicMock()
        self.mock_model_cls = MagicMock()

        self.mock_transformers.AutoTokenizer = self.mock_tokenizer_cls
        self.mock_transformers.AutoModelForSeq2SeqLM = self.mock_model_cls

        sys.modules["transformers"] = self.mock_transformers

        # Reload the module to ensure it picks up the mocked dependencies
        if "translation" in sys.modules:
            importlib.reload(sys.modules["translation"])

        import translation

        self.translation_module = translation

    def test_load_model_first_time(self):
        """Test that load_model initializes tokenizer and model correctly when called the first time."""
        # Arrange
        translator = self.translation_module.Translator()

        # Ensure they start as None
        self.assertIsNone(translator.model)
        self.assertIsNone(translator.tokenizer)

        # Setup the mocks
        mock_tokenizer_instance = MagicMock()
        self.mock_tokenizer_cls.from_pretrained.return_value = mock_tokenizer_instance

        mock_model_instance = MagicMock()
        mock_model_instance_to = MagicMock()
        mock_model_instance.to.return_value = mock_model_instance_to
        self.mock_model_cls.from_pretrained.return_value = mock_model_instance

        # Act
        translator.load_model()

        # Assert
        self.mock_tokenizer_cls.from_pretrained.assert_called_once_with(
            "facebook/nllb-200-distilled-600M"
        )
        self.mock_model_cls.from_pretrained.assert_called_once_with(
            "facebook/nllb-200-distilled-600M"
        )
        mock_model_instance.to.assert_called_once_with(
            "cpu"
        )  # Since we mocked torch.cuda.is_available to False

        self.assertEqual(translator.tokenizer, mock_tokenizer_instance)
        self.assertEqual(translator.model, mock_model_instance_to)

    def test_load_model_already_loaded(self):
        """Test that load_model does nothing if the model is already loaded."""
        # Arrange
        translator = self.translation_module.Translator()

        mock_existing_model = MagicMock()
        mock_existing_tokenizer = MagicMock()

        translator.model = mock_existing_model
        translator.tokenizer = mock_existing_tokenizer

        # Act
        translator.load_model()

        # Assert
        # The classes should not be called because it returns early
        self.mock_tokenizer_cls.from_pretrained.assert_not_called()
        self.mock_model_cls.from_pretrained.assert_not_called()

        self.assertEqual(translator.model, mock_existing_model)
        self.assertEqual(translator.tokenizer, mock_existing_tokenizer)


if __name__ == "__main__":
    unittest.main()
