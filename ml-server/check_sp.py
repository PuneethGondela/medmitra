try:
    import sentencepiece
    print("SentencePiece imported successfully")
    print("Version:", sentencepiece.__version__)
    
    from transformers import NllbTokenizer
    print("NllbTokenizer imported successfully")

except Exception as e:
    print(e)
