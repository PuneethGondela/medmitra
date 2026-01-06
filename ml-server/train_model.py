
import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "True"

import torch
from datasets import load_dataset
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    TrainingArguments,
    Trainer,
    DataCollatorForLanguageModeling
)
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training, TaskType

# Configuration
MODEL_NAME = "Qwen/Qwen2-1.5B-Instruct" 
DATA_PATH = "data/train.jsonl"
OUTPUT_DIR = "adapters"
MAX_SEQ_LENGTH = 2048

def main():
    print(f"Loading model: {MODEL_NAME}")
    
    # 1. Quantization Config (4-bit for memory efficiency)
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.float16,
        bnb_4bit_use_double_quant=True,
    )

    # 2. Load Model & Tokenizer
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_NAME,
        quantization_config=bnb_config,
        device_map="auto",
        trust_remote_code=True
    )
    
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, trust_remote_code=True)
    tokenizer.pad_token = tokenizer.eos_token # Qwen doesn't have a pad token by default

    # 3. Prepare Model for Training
    model = prepare_model_for_kbit_training(model)
    
    # 4. LoRA Config
    peft_config = LoraConfig(
        r=16,
        lora_alpha=16,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
        lora_dropout=0.05,
        bias="none",
        task_type=TaskType.CAUSAL_LM
    )
    
    model = get_peft_model(model, peft_config)
    model.print_trainable_parameters()

    # 5. Load & Format Dataset
    print(f"Loading dataset from {DATA_PATH}")
    dataset = load_dataset("json", data_files=DATA_PATH, split="train")

    def format_chat_template(examples):
        texts = []
        for messages in examples["messages"]:
            # Simple format: User:... Assistant:... if template fails
            # But Qwen uses ChatML usually. Let's try apply_chat_template if available
            try:
                text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=False)
            except:
                # Fallback manual formatting
                text = ""
                for msg in messages:
                    role = msg["role"]
                    content = msg["content"]
                    if role == "user":
                        text += f"<|im_start|>user\n{content}<|im_end|>\n"
                    elif role == "assistant":
                        text += f"<|im_start|>assistant\n{content}<|im_end|>\n"
            texts.append(text)
        return {"text": texts}

    print("Formatting dataset...")
    # Map dataset
    dataset = dataset.map(format_chat_template, batched=True)
    
    # Tokenize
    def tokenize_function(examples):
        return tokenizer(examples["text"], padding="max_length", truncation=True, max_length=MAX_SEQ_LENGTH)
    
    tokenized_datasets = dataset.map(tokenize_function, batched=True)

    # 6. Training Arguments
    training_args = TrainingArguments(
        output_dir=OUTPUT_DIR,
        per_device_train_batch_size=2,
        gradient_accumulation_steps=4,
        learning_rate=2e-4,
        logging_steps=1,
        max_steps=40, # Reduced for recovery run
        save_strategy="no", # or steps
        fp16=True,
        optim="paged_adamw_8bit",
        report_to="none" # Disable wandb
    )

    # 7. Trainer
    trainer = Trainer(
        model=model,
        train_dataset=tokenized_datasets,
        args=training_args,
        data_collator=DataCollatorForLanguageModeling(tokenizer, mlm=False),
    )

    # 8. Train
    print("Starting Training...")
    trainer.train()

    # 9. Save
    print("Saving Adapter...")
    try:
        # Try standard save first
        model.save_pretrained(OUTPUT_DIR)
    except Exception as e:
        print(f"Standard save failed: {e}")
        print("Attempting manual save...")
        from peft.utils import get_peft_model_state_dict
        import json
        
        os.makedirs(OUTPUT_DIR, exist_ok=True)
        # Save weights
        weights = get_peft_model_state_dict(model)
        torch.save(weights, os.path.join(OUTPUT_DIR, "adapter_model.bin"))
        
        # Save config
        model.peft_config['default'].save_pretrained(OUTPUT_DIR)
        print("Manual save successful.")

    print(f"Saved to {OUTPUT_DIR}")

if __name__ == "__main__":
    main()
