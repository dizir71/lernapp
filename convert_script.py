import sys
import os
import subprocess
import importlib.util

def check_and_install_dependencies():
    """Checks for the python-docx library and installs it if missing."""
    package_name = "python-docx"
    module_name = "docx"
    
    spec = importlib.util.find_spec(module_name)
    if spec is None:
        print(f"'{package_name}' is not installed. Attempting to install...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", package_name])
            print(f"'{package_name}' installed successfully.")
        except subprocess.CalledProcessError as e:
            print(f"Error: Failed to install '{package_name}'.")
            print(f"Please try to install it manually by running: pip install {package_name}")
            sys.exit(1)

def convert_docx_to_text(docx_path):
    """Converts a single DOCX file to a plain text file in the same directory."""
    try:
        import docx # Import here after check

        doc = docx.Document(docx_path)
        full_text = [para.text for para in doc.paragraphs]
        
        # Save the .txt file in the same directory as the .docx file
        base_name_without_ext = os.path.splitext(docx_path)[0]
        output_filepath = f"{base_name_without_ext}.txt"
        
        with open(output_filepath, "w", encoding="utf-8") as out_file:
            out_file.write('\n'.join(full_text))

        print(f"Successfully converted '{docx_path}'")

    except Exception as e:
        # Special handling for docx files that might be corrupted or in the wrong format
        if "File is not a zip file" in str(e):
             print(f"Skipping '{docx_path}': It may be a .doc file saved with a .docx extension, which is not supported.")
        else:
             print(f"An error occurred while processing '{docx_path}': {e}")

def process_all_directories():
    """Walks through all subdirectories and converts .docx files, skipping .doc files."""
    print("\nStarting search for Word documents...")
    # Walk through the current directory '.'
    for root, dirs, files in os.walk('.'):
        # To be safe, let's not search in any directory that might contain junk
        if "junk" in dirs:
            dirs.remove("junk")
        if ".git" in dirs:
            dirs.remove(".git")

        for filename in files:
            file_path = os.path.join(root, filename)
            if filename.lower().endswith(".docx"):
                convert_docx_to_text(file_path)
            elif filename.lower().endswith(".doc"):
                print(f"Skipping unsupported .doc file: '{file_path}'")

if __name__ == "__main__":
    check_and_install_dependencies()
    process_all_directories()
    print("\nConversion process finished.")
