import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

MODEL_NAME = "microsoft/Phi-3-mini-4k-instruct"

print(f"Torch version: {torch.__version__}")
print(f"CUDA available: {torch.cuda.is_available()}")

try:
    print("Loading Tokenizer...")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, trust_remote_code=False)
    
    print("Loading Model...")
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_NAME, 
        device_map="auto", 
        torch_dtype=torch.float16, 
        trust_remote_code=False
    )
    print("Model loaded.")

    messages = [{"role": "user", "content": "Hello, how are you?"}]
    prompt = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    
    print("Tokenizing...")
    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
    
    print("Generating...")
    outputs = model.generate(
        **inputs, 
        max_new_tokens=50,
        do_sample=True,
        temperature=0.7
    )
    print("Decoding...")
    text = tokenizer.decode(outputs[0], skip_special_tokens=True)
    print("Result:", text)

except Exception as e:
    print("\nCRASHED WITH ERROR:")
    print(e)
    import traceback
    traceback.print_exc()
