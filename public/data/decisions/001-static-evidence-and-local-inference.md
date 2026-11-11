# ADR 001: Static evidence retrieval with optional local inference

Status: accepted for the standalone demonstrator, 11 November 2026.

The application is an independently built and hosted project. A hiring manager should be able to ask questions and inspect evidence without provisioning a server, obtaining credentials or downloading a model. Local development also supports Python/LangChain and Ollama inference.

The default experience therefore runs retrieval and exact quotation in the browser. An optional loopback Python adapter uses LangChain ChatOllama to generate a draft. Both read the same canonical, synthetic corpus. The browser sends passage IDs; the server reloads their text and applies its own role and source-status checks. This avoids maintaining a second retrieval algorithm in Python.

BM25 and a small synonym dictionary make retrieval choices visible on a 26-passage corpus. Source-status filters and labelled fact checks demonstrate governance decisions. Neither query coverage nor a fact label establishes general language understanding. The interface and evaluation report expose these limits.

A server-only RAG application was considered. It would provide a clearer place for real authentication and private documents, but would make the public demonstration depend on server hosting and model availability. It remains the appropriate direction if private customer data or multi-user access becomes a requirement.

Browser embeddings and a vector database were also considered. They would add model downloads, indexing and deployment work before the small fixture demonstrates a need for semantic retrieval. Their benefit should be evaluated on a larger, separately labelled dataset. The initial two false abstentions are preserved in historical reports and fixed by general Porter normalization. A corpus-vocabulary coverage guard limits new false positives on undocumented topics; the keyword baseline is unchanged.

Consequences: the static demo is reproducible and needs no model credentials. Its role selector cannot protect secrets because its corpus is public. The local service independently enforces context access for its configured role, but is not a complete identity system. Automated citation checks establish that references are admitted source IDs; human review is required to judge whether generated claims follow from them.

Local inference submits only retrieved passages meeting the evidence threshold. Lower-relevance hits remain visible for inspection, but do not become model context. The server independently rejects unavailable or conflicting submitted sources, so this selection does not relax its admission rules.

The model returns exactly one concise answer with supporting source IDs under a JSON schema whose source-ID enum is built from admitted context. Application code validates its references and renders the inline citations. This removes citation formatting from the model's responsibilities while rejecting unknown references and extra generated claims.

Earlier multi-claim responses included an omitted backup-policy exception and a contradictory extra abstention. Later semantic review also found an unsupported permission despite passing keyword checks. The validated default is now Qwen3 8B with thinking disabled, a 4,096-token context and guidance to distinguish obligations from permissions. Its full recorded run passes all 68 cases. Content checks exclude citation IDs so source names cannot accidentally satisfy answer checks. All 46 generated answers are separately compared with their cited text in the agent review. Human review remains distinct; the earlier failures remain available as evidence of the limitations of citation and keyword checks.
