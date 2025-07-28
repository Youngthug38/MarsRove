const fetch = require('node-fetch'); // Required for fetch in Netlify Functions

exports.handler = async function(event, context) {
    const { rover, sol, latest, image_url } = event.queryStringParameters; // Added image_url

    // Handle image proxy requests
    if (image_url) {
        try {
            const imageResponse = await fetch(image_url);
            if (!imageResponse.ok) {
                throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
            }
            
            // Get content type from response headers to return it correctly
            const contentType = imageResponse.headers.get('content-type') || 'application/octet-stream';
            const imageBuffer = await imageResponse.buffer(); // Get raw binary data

            return {
                statusCode: 200,
                headers: {
                    'Content-Type': contentType,
                    'Access-Control-Allow-Origin': '*', // Crucial for CORS on your frontend
                    'Cache-Control': 'public, max-age=31536000' // Cache images for performance
                },
                body: imageBuffer.toString('base64'), // Base64 encode the image for Lambda response
                isBase64Encoded: true, // Tell Lambda the body is base64 encoded
            };
        } catch (error) {
            console.error("Image proxy error:", error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: `Failed to proxy image: ${error.message}` })
            };
        }
    }

    // --- Existing logic for NASA API data requests (unchanged) ---
    const NASA_API_KEY = process.env.NASA_API_KEY; // This key is stored securely on Netlify

    if (!NASA_API_KEY) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "API Key is missing." })
        };
    }

    let apiUrl;
    if (latest === 'true') {
        apiUrl = `https://api.nasa.gov/mars-photos/api/v1/rovers/${rover}/latest_photos?api_key=${NASA_API_KEY}`;
    } else if (sol) {
        apiUrl = `https://api.nasa.gov/mars-photos/api/v1/rovers/${rover}/photos?sol=${sol}&api_key=${NASA_API_KEY}`;
    } else {
        // Fallback for manifest or other generic calls
        apiUrl = `https://api.nasa.gov/mars-photos/api/v1/manifests/${rover}?api_key=${NASA_API_KEY}`;
    }

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`NASA API returned status ${response.status}: ${errorText}`);
        }
        const data = await response.json();

        return {
            statusCode: 200,
            body: JSON.stringify(data),
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*" // Allow requests from your Netlify frontend
            }
        };
    } catch (error) {
        console.error("Function error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Failed to fetch data from NASA: ${error.message}` })
        };
    }
};