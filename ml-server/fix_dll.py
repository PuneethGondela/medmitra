import os
import shutil
import glob

def fix_dll():
    # Site packages path
    site_packages = r"C:\Users\nidra\OneDrive\Desktop\Med Mitra\ml-server\venv\Lib\site-packages"
    torch_lib = os.path.join(site_packages, "torch", "lib")
    
    # Locate libiomp5md.dll (usually in numpy or installed via intel-openmp)
    # Search recursively in site-packages
    candidates = glob.glob(os.path.join(site_packages, "**", "libiomp5md.dll"), recursive=True)
    
    if not candidates:
        print("Could not find libiomp5md.dll in site-packages.")
        # Try finding in specific folders if glob didn't work well
        return

    source = candidates[0]
    print(f"Found source DLL: {source}")
    
    dest = os.path.join(torch_lib, "libomp140.x86_64.dll")
    
    if not os.path.exists(dest):
        print(f"Copying {source} to {dest}...")
        try:
            shutil.copy2(source, dest)
            print("DLL copied successfully.")
        except Exception as e:
            print(f"Failed to copy DLL: {e}")
    else:
        print(f"Destination {dest} already exists. Skipping.")

if __name__ == "__main__":
    fix_dll()
