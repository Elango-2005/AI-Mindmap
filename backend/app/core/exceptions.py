class MindMapNotFoundError(Exception):
    """
    Raised when a requested mind map does not exist.
    """
    pass


class MindMapAccessDeniedError(Exception):
    """
    Raised when the current user does not own the mind map.
    """
    pass


class InvalidAITopicError(Exception):
    """
    Raised when an invalid topic is provided for AI generation.
    """
    pass


class AIGenerationError(Exception):
    """
    Raised when AI mind-map generation fails.
    """
    pass