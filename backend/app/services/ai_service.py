from google import genai

from app.core.config import settings
from app.core.exceptions import (
    AIGenerationError,
    InvalidAITopicError,
)

class AIService:
    """
    Service responsible for communicating with Google Gemini.
    """

    def __init__(self):
        self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
        self.model = "gemini-3.6-flash"

    def generate_text(self, prompt: str) -> str:
        """
        Send a prompt to Gemini and return the generated text.
        """

        response = self.client.models.generate_content(
            model=self.model,
            contents=prompt,
        )

        return response.text

    def build_mind_map_prompt(self, topic: str) -> str:
        """
        Build a prompt that instructs Gemini to generate
        a structured mind map.
        """

        return f"""
You are an AI assistant that specializes in creating
clear and useful mind maps.

Create a hierarchical mind map for the following topic:

TOPIC:
{topic}

Follow these rules:

1. Treat the given topic as the main/root concept.
2. Identify the most important concepts directly related
   to the root topic.
3. Organize concepts into a clear parent-child hierarchy.
4. Include meaningful subtopics rather than individual words.
5. Keep the hierarchy approximately 3 to 4 levels deep.
6. Avoid unnecessary or repetitive concepts.
7. Make the relationships between concepts logically clear.
8. Focus on educationally useful information.
9. Do not include unrelated information.
10. Do not invent facts.

The response must contain:
- A list of nodes.
- A list of edges connecting the nodes.

Every node must have a unique string ID.
Every edge must reference existing node IDs.

Return only the structured mind map data.
"""

    def generate_mind_map(self, topic: str) -> dict:
        """
        Generate a structured mind map using Gemini.
        """

        prompt = self.build_mind_map_prompt(topic)

        response = self.client.models.generate_content(
            model=self.model,
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_schema": {
                    "type": "object",
                    "properties": {
                        "nodes": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "id": {
                                        "type": "string"
                                    },
                                    "label": {
                                        "type": "string"
                                    }
                                },
                                "required": [
                                    "id",
                                    "label"
                                ]
                            }
                        },
                        "edges": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "source": {
                                        "type": "string"
                                    },
                                    "target": {
                                        "type": "string"
                                    }
                                },
                                "required": [
                                    "source",
                                    "target"
                                ]
                            }
                        }
                    },
                    "required": [
                        "nodes",
                        "edges"
                    ]
                }
            },
        )

        return response.parsed

    def generate_sub_concepts(self, concept: str, count: int = 4) -> list[str]:
        """
        Generate related sub-concepts for a given topic.
        """
        prompt = f"Identify {count} distinct and important sub-concepts directly related to the concept: '{concept}'. Keep each concept brief (1-4 words). Do not include the original concept in the list."

        response = self.client.models.generate_content(
            model=self.model,
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_schema": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    }
                }
            },
        )

        return response.parsed

    def find_connections(self, concept: str, other_nodes: list[dict]) -> list[str]:
        """
        Identify which nodes from the provided list are logically related to the concept.
        Returns a list of node IDs.
        """
        nodes_context = "\n".join([f"- {n['id']}: {n['label']}" for n in other_nodes])
        
        prompt = f"""
        Given the main concept: '{concept}'
        
        And the following list of other concepts in the mind map:
        {nodes_context}
        
        Which of these other concepts have a direct and strong logical connection to '{concept}'?
        Return ONLY the IDs of the related concepts. If none are related, return an empty array.
        """

        response = self.client.models.generate_content(
            model=self.model,
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_schema": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    }
                }
            },
        )

        return response.parsed

    def chat_modify_mind_map(self, instruction: str, current_graph: dict, selected_node_id: str | None = None, selected_node_label: str | None = None) -> dict:
        """
        Process a user instruction to modify an existing mind map.
        Returns the modified graph and a text response.
        """
        import json
        graph_json = json.dumps(current_graph)
        
        selection_context = ""
        if selected_node_id and selected_node_label:
            selection_context = f"\nUser's Currently Selected Node:\nID: {selected_node_id}\nLabel: {selected_node_label}\n(If the user's instruction is relative like 'this node', 'summarize it', or 'add subtopics', they are referring to this selected node.)\n"
        
        prompt = f"""
        You are an AI mind map editor. 
        You are provided with the current state of a mind map (nodes and edges) and a user instruction.
        Your task is to follow the user's instruction and return the ENTIRE updated mind map, along with a short response message explaining what you did.
        {selection_context}
        User Instruction:
        {instruction}
        
        Current Mind Map JSON:
        {graph_json}
        
        Rules:
        1. You must return ALL nodes and edges that should exist in the final map. If you are only modifying a few nodes, you MUST still include the untouched nodes in your response.
        2. If the user asks to summarize or explain something, you can leave the graph untouched (just return the same nodes/edges) and provide the explanation in the 'response_text' field.
        3. If the user asks to add nodes, create them and link them appropriately.
        4. Every node must have a unique string ID.
        5. Every edge must reference existing node IDs.
        """

        response = self.client.models.generate_content(
            model=self.model,
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_schema": {
                    "type": "object",
                    "properties": {
                        "response_text": {
                            "type": "string"
                        },
                        "nodes": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "id": {"type": "string"},
                                    "label": {"type": "string"}
                                },
                                "required": ["id", "label"]
                            }
                        },
                        "edges": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "source": {"type": "string"},
                                    "target": {"type": "string"}
                                },
                                "required": ["source", "target"]
                            }
                        }
                    },
                    "required": ["response_text", "nodes", "edges"]
                }
            },
        )

        return response.parsed

    def validate_mind_map(self, mind_map: dict) -> dict:
        """
        Validate the structure and relationships of an AI-generated
        mind map.
        """

        # --------------------------------------------------
        # Validate top-level structure
        # --------------------------------------------------

        if not isinstance(mind_map, dict):
            raise ValueError("Mind map must be a dictionary.")

        if "nodes" not in mind_map:
            raise ValueError("Mind map must contain 'nodes'.")

        if "edges" not in mind_map:
            raise ValueError("Mind map must contain 'edges'.")

        nodes = mind_map["nodes"]
        edges = mind_map["edges"]

        if not isinstance(nodes, list):
            raise ValueError("'nodes' must be a list.")

        if not isinstance(edges, list):
            raise ValueError("'edges' must be a list.")

        # --------------------------------------------------
        # Validate nodes
        # --------------------------------------------------

        node_ids = set()

        for node in nodes:
            if not isinstance(node, dict):
                raise ValueError("Each node must be an object.")

            node_id = node.get("id")
            label = node.get("label")

            if not isinstance(node_id, str) or not node_id.strip():
                raise ValueError("Every node must have a valid 'id'.")

            if not isinstance(label, str) or not label.strip():
                raise ValueError(
                    f"Node '{node_id}' must have a valid 'label'."
                )

            if node_id in node_ids:
                raise ValueError(
                    f"Duplicate node ID found: '{node_id}'."
                )

            node_ids.add(node_id)

        # --------------------------------------------------
        # Validate edges
        # --------------------------------------------------

        for edge in edges:
            if not isinstance(edge, dict):
                raise ValueError("Each edge must be an object.")

            source = edge.get("source")
            target = edge.get("target")

            if not isinstance(source, str) or not source.strip():
                raise ValueError(
                    "Every edge must have a valid 'source'."
                )

            if not isinstance(target, str) or not target.strip():
                raise ValueError(
                    "Every edge must have a valid 'target'."
                )

            if source not in node_ids:
                raise ValueError(
                    f"Edge source '{source}' does not exist in nodes."
                )

            if target not in node_ids:
                raise ValueError(
                    f"Edge target '{target}' does not exist in nodes."
                )

            if source == target:
                raise ValueError(
                    f"Self-referencing edge detected for node '{source}'."
                )

        return mind_map

    def create_mind_map(self, topic: str) -> dict:
        """
        Generate and validate a mind map for the given topic.
        """

        # --------------------------------------------------
        # Validate user input
        # --------------------------------------------------

        if not isinstance(topic, str) or not topic.strip():
            raise InvalidAITopicError(
                "Topic must be a non-empty string."
            )

        topic = topic.strip()

        # --------------------------------------------------
        # Generate mind map using Gemini
        # --------------------------------------------------

        try:
            mind_map = self.generate_mind_map(topic)
        except Exception as e:
            raise AIGenerationError(
                "Failed to generate mind map using AI."
        ) from e

        # --------------------------------------------------
        # Validate AI-generated structure
        # --------------------------------------------------

        try:
            validated_mind_map = self.validate_mind_map(
                mind_map
            )
        except ValueError as e:
            raise AIGenerationError(
            "AI generated an invalid mind map."
        ) from e

        return validated_mind_map
    
    
ai_service = AIService()