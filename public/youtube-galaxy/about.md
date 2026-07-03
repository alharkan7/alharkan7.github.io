# Semantic Video "Galaxy"

This is an interactive 3D and 2D data visualization exploring my [YouTube watch history](/videos). 

This project maps thousands of videos into a virtual 'galaxy' of data, grouping them by semantic similarity so you can visually explore patterns in content consumption.

## How It Works

The backend data processing pipeline involves several steps of machine learning to organize unstructured video titles into this structured galaxy:

### 1. Generating Embeddings
We take the raw titles of the YouTube videos and pass them through Google's **Gemini API** using the `gemini-embedding-2` model. This model reads the text and generates a high-dimensional mathematical vector (an embedding) that deeply captures the underlying semantic meaning and context of the title.

### 2. Dimensionality Reduction
Because human brains and computer screens can't easily visualize high-dimensional vectors, we use an algorithm called **UMAP** (Uniform Manifold Approximation and Projection). UMAP mathematically compresses these embeddings down into a 3D coordinate space while preserving the relational distances. As a result, videos with similar topics are naturally placed closer together in this 3D space.

### 3. Clustering
To categorize the videos visually, we apply the **K-Means clustering** algorithm. This automatically groups the continuous 3D coordinates into distinct clusters, mapping out the overarching "continents" of the galaxy.

### 4. Automated Labeling
Instead of manually guessing what each cluster represents, we use the **Gemini 2.5 Flash** LLM. We pass it a random sample of 60 video titles from each cluster and ask it to automatically generate a concise 1-3 word label describing the core theme of that cluster.

### 5. Nearest Neighbors (KNN)
For the "Force Directed" layout, we calculate the k-nearest neighbors (the 5 closest related videos based on semantic distance) for every single item. These act as physical springs in the simulation, pulling the most tightly related concepts together into a web.

Enjoy exploring the galaxy!
