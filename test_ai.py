import sys
import os
from dotenv import load_dotenv

load_dotenv('backend/.env')

sys.path.append(os.path.abspath('backend'))
from app.services.ai_service import AIService

try:
    service = AIService()
    print("Sending request to generate mind map...")
    result = service.generate_mind_map("Machine learning concepts", 2)
    print("Success:")
    print(result)
except Exception as e:
    import traceback
    traceback.print_exc()

