import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel

MODEL_NAME = "Qwen/Qwen2-1.5B-Instruct" 
ADAPTER_PATH = "adapters"

def main():
    print("Loading base model...")
    # Load base model - quantized to save memory if needed, but let's try fp16 execution
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_NAME, 
        device_map="auto", 
        torch_dtype=torch.float16, 
        trust_remote_code=True
    )
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, trust_remote_code=True)

    print("Loading adapter...")
    try:
        model = PeftModel.from_pretrained(model, ADAPTER_PATH)
        print("Adapter loaded successfully.")
    except Exception as e:
        print(f"Failed to load adapter: {e}")
        return

    messages = [
        {"role": "user", "content": "I have a headache and high fever. What should I do?"}
    ]
    
    # Qwen chat template
    text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    model_inputs = tokenizer([text], return_tensors="pt").to(model.device)

    print("Generating response...")
    generated_ids = model.generate(
        model_inputs.input_ids,
        max_new_tokens=256,
        do_sample=True,
        temperature=0.7
    )
    
    generated_ids = [
        output_ids[len(input_ids):] for input_ids, output_ids in zip(model_inputs.input_ids, generated_ids)
    ]

    response = tokenizer.batch_decode(generated_ids, skip_special_tokens=True)[0]
    print("-" * 50)
    print(f"Response:\n{response}")
    print("-" * 50)

if __name__ == "__main__":
    main()
