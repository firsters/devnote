const API_KEY = process.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  console.error("VITE_GEMINI_API_KEY not found in environment");
  process.exit(1);
}

async function listModels() {
  try {
    console.log("Fetching available models via native REST fetch...");
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error("API Error:", JSON.stringify(data.error, null, 2));
      return;
    }

    console.log("--- Available Models ---");
    if (data.models) {
      data.models.forEach((model) => {
        console.log(`- ${model.name} (${model.displayName})`);
        console.log(`  Supported methods: ${model.supportedGenerationMethods.join(", ")}`);
      });
    } else {
      console.log("No models found.");
    }
    console.log("------------------------");
  } catch (error) {
    console.error("Error fetching models:", error);
  }
}

listModels();
