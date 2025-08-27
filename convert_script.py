import sys
import os
import subprocess
import importlib.util

def check_and_install_dependencies():
    """Checks for the PyMuPDF library and installs it if missing."""
    package_name = "PyMuPDF"
    module_name = "fitz"
    
    spec = importlib.util.find_spec(module_name)
    if spec is None:
        print(f"'{package_name}' is not installed. Attempting to install...")
        try:
            # Use check_call to ensure pip command succeeds
            subprocess.check_call([sys.executable, "-m", "pip", "install", package_name])
            print(f"'{package_name}' installed successfully.")
        except subprocess.CalledProcessError as e:
            print(f"Error: Failed to install '{package_name}'.")
            print(f"Please try to install it manually by running: pip install {package_name}")
            print(f"Details: {e}")
            sys.exit(1)
    else:
        print(f"'{package_name}' is already installed.")

def convert_pdf_to_text(pdf_path, output_dir):
    """
    Converts a single PDF file to a formatted text file.
    Each page's text is extracted and separated by a page break marker.
    """
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    try:
        # Import fitz here, after the check has run
        import fitz
        
        doc = fitz.open(pdf_path)
        base_name = os.path.basename(pdf_path)
        file_name_without_ext = os.path.splitext(base_name)[0]
        output_filepath = os.path.join(output_dir, f"{file_name_without_ext}.txt")
        
        print(f"Processing '{pdf_path}'...")

        with open(output_filepath, "w", encoding="utf-8") as out_file:
            for page_num, page in enumerate(doc):
                out_file.write(f"--- Page {page_num + 1} ---\n\n")
                out_file.write(page.get_text("text"))
                out_file.write("\n\n")

        print(f"Successfully converted to '{output_filepath}'")

    except Exception as e:
        print(f"An error occurred while processing '{pdf_path}': {e}")

if __name__ == "__main__":
    # First, run the dependency check
    check_and_install_dependencies()

    # Then, proceed with the script's main logic
    if len(sys.argv) != 3:
        print("\nUsage: python convert_script.py <path_to_pdf_or_folder> <output_directory>")
        sys.exit(1)
    
    input_path = sys.argv[1]
    output_folder = sys.argv[2]

    if os.path.isdir(input_path):
        print(f"\nProcessing all PDF files in directory: {input_path}")
        for filename in os.listdir(input_path):
            if filename.lower().endswith(".pdf"):
                pdf_file_path = os.path.join(input_path, filename)
                convert_pdf_to_text(pdf_file_path, output_folder)
    elif os.path.isfile(input_path) and input_path.lower().endswith(".pdf"):
        convert_pdf_to_text(input_path, output_folder)
    else:
        print(f"\nError: The provided path '{input_path}' is not a valid PDF file or directory.")
        sys.exit(1)
