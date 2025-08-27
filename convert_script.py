import sys
import os
import subprocess
import importlib.util

# --- Configuration ---
VENV_DIR = "venv"

# --- Core Functions ---

def check_and_install_dependencies():
    """
    Checks for the python-docx library inside the virtual environment
    and installs it if missing.
    """
    package_name = "python-docx"
    module_name = "docx"
    
    print(f"Checking for '{package_name}'...")
    spec = importlib.util.find_spec(module_name)
    
    if spec is None:
        print(f"'{package_name}' is not installed. Attempting to install...")
        try:
            # Ensure we are using the pip from the venv
            pip_executable = os.path.join(VENV_DIR, 'bin', 'pip') if sys.platform != "win32" else os.path.join(VENV_DIR, 'Scripts', 'pip.exe')
            subprocess.check_call([pip_executable, "install", package_name])
            print(f"'{package_name}' installed successfully.")
        except (subprocess.CalledProcessError, FileNotFoundError) as e:
            print(f"Error: Failed to install '{package_name}'.")
            print(f"Please try to activate the venv and install manually: pip install {package_name}")
            print(f"Details: {e}")
            sys.exit(1)
    else:
        print(f"'{package_name}' is already installed.")


def convert_docx_to_text(docx_path):
    """Converts a single DOCX file to a plain text file in the same directory."""
    try:
        import docx # Import here after check

        doc = docx.Document(docx_path)
        full_text = [para.text for para in doc.paragraphs]
        
        base_name_without_ext = os.path.splitext(docx_path)[0]
        output_filepath = f"{base_name_without_ext}.txt"
        
        with open(output_filepath, "w", encoding="utf-8") as out_file:
            out_file.write('\n'.join(full_text))

        print(f"Successfully converted '{docx_path}'")

    except Exception as e:
        if "File is not a zip file" in str(e):
             print(f"Skipping '{docx_path}': It may be a .doc file saved with a .docx extension, which is not supported.")
        else:
             print(f"An error occurred while processing '{docx_path}': {e}")

def process_all_directories():
    """Walks through all subdirectories and converts .docx files, skipping .doc files."""
    print("\nStarting search for Word documents...")
    for root, dirs, files in os.walk('.'):
        # Exclude specific directories from the search
        dirs_to_skip = {VENV_DIR, ".git", "junk"}
        dirs[:] = [d for d in dirs if d not in dirs_to_skip]

        for filename in files:
            file_path = os.path.join(root, filename)
            if filename.lower().endswith(".docx"):
                convert_docx_to_text(file_path)
            elif filename.lower().endswith(".doc"):
                print(f"Skipping unsupported .doc file: '{file_path}'")

# --- Main Execution Block ---

if __name__ == "__main__":
    if sys.platform == "win32":
        venv_python = os.path.join(VENV_DIR, 'Scripts', 'python.exe')
    else:
        venv_python = os.path.join(VENV_DIR, 'bin', 'python')

    # Check if we are running outside the venv and need to relaunch
    if os.path.abspath(sys.executable) != os.path.abspath(venv_python):
        if not os.path.isdir(VENV_DIR):
            print(f"Creating virtual environment at '{VENV_DIR}'...")
            try:
                subprocess.check_call([sys.executable, "-m", "venv", VENV_DIR])
                print("Virtual environment created successfully.")
            except subprocess.CalledProcessError as e:
                print(f"Error: Failed to create virtual environment. {e}")
                sys.exit(1)

        print("Relaunching script inside the virtual environment...")
        try:
            subprocess.check_call([venv_python, __file__])
            sys.exit(0)
        except (subprocess.CalledProcessError, FileNotFoundError) as e:
            print(f"Error: Failed to relaunch script in venv. {e}")
            sys.exit(1)
            
    else:
        # --- We are in the VIRTUAL environment ---
        print("\n--- Running inside virtual environment ---")
        check_and_install_dependencies()
        process_all_directories()
        print("\nConversion process finished.")
