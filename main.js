import esriConfig from "https://js.arcgis.com/4.32/@arcgis/core/config.js";
import WebMap from "https://js.arcgis.com/4.32/@arcgis/core/WebMap.js";
import MapView from "https://js.arcgis.com/4.32/@arcgis/core/views/MapView.js";
import FeatureLayer from "https://js.arcgis.com/4.32/@arcgis/core/layers/FeatureLayer.js";

esriConfig.apiKey = "AAPTxy8BH1VEsoebNVZXo8HurKAZB3sRp7Z830yYH3o73I_zpEaiQsJmfHCUr-e1yHpimExTT_K7fkezDCAGUhxqQf8fFChRPquaw86R_-kq7h46jzvgTfTJHK-CbEOTW4I7XD1_Ddicnwd5FBz1Gfx7XwYftYjTQlqsrd-pR8CmPo0Qk9mT-6LTIabau5RUyqZMPIKG9GLjdvXkAYcsI4XhEmNTf3aPunK5ryKEUIPu7C8.AT1_QogzFqVY";

let chart;
const currentMeasure = "Ore Production (Tons)"; // Req ID 1.5

const webmap = new WebMap({
    portalItem: { id: "af53f741d9814c088bb9b76bc36ee81a" }
});

const view = new MapView({
    container: "viewDiv",
    map: webmap
});

const productionTable = new FeatureLayer({
    portalItem: { id: "25692f8846fc4053a7e37b767fa63be1" }
});

// ROBUST CLICK LOGIC
view.on("click", async (event) => {
    const response = await view.hitTest(event);
    const hit = response.results.find(r => 
        r.graphic && r.graphic.layer && r.graphic.layer.title.includes("Locations")
    );

    if (hit) {
        const attrsRaw = hit.graphic.attributes;
        const objectId = attrsRaw.OBJECTID || attrsRaw.ObjectId || attrsRaw.fid;

        if (objectId === undefined) return;

        try {
            const layer = hit.graphic.layer;
            const featureResult = await layer.queryFeatures({
                objectIds: [objectId],
                outFields: ["*"] 
            });

            if (featureResult.features.length > 0) {
                const fullAttrs = featureResult.features[0].attributes;
                const name = fullAttrs.Mine_Name || fullAttrs.mine_name || "Unknown Mine";
                const id = fullAttrs.Mine_ID || fullAttrs.mine_id;

                document.getElementById("mineName").innerText = name;
                document.getElementById("instruction").style.display = "none";
                
                if (id) { 
                    updateProductionData(id); 
                }
            }
        } catch (error) {
            console.error("Database Query Failed:", error);
        }
    } else {
        // Req ID 1.4: Clicked away from a mine point, clear sidebar
        resetUI();
    }
});

// Req ID 1.4: Reset Sidebar helper
function resetUI() {
    document.getElementById("mineName").innerText = "Select a Mine";
    document.getElementById("instruction").style.display = "block";
    if (chart) chart.destroy();
}

async function updateProductionData(mineId) {
    const query = productionTable.createQuery();
    query.where = `Mine_ID = '${mineId}' OR mine_id = '${mineId}'`;
    query.outFields = ["*"];
    query.orderByFields = ["Year ASC"];

    try {
        const result = await productionTable.queryFeatures(query);
        const features = result.features;
        
        // Req ID 1.8: Aggregation across commodities
        const aggregated = {};
        features.forEach(f => {
            const year = f.attributes.Year || f.attributes.year;
            const tons = f.attributes.Ore_Tons || f.attributes.ore_tons;
            if (year) {
                if (!aggregated[year]) aggregated[year] = 0;
                if (tons !== null && tons !== undefined) {
                    aggregated[year] += tons;
                }
            }
        });

        if (Object.keys(aggregated).length > 0) {
            renderChart(aggregated);
        } else {
            document.getElementById("mineName").innerText += " (No records found)";
            if (chart) chart.destroy();
        }
    } catch (err) {
        console.error("Query Error:", err);
    }
}

function renderChart(aggregatedData) {
    // Req ID 1.6: Standard range 1845-1985 maintained
    const minYear = 1845;
    const maxYear = 1985;

    const labels = [];
    const data = [];

    for (let y = minYear; y <= maxYear; y++) {
        labels.push(y);
        const val = aggregatedData[y];
        // Req ID 1.2: Nulls used for missing data (skips bar)
        data.push((val !== undefined && val !== null) ? val : null);
    }

    const ctx = document.getElementById('productionChart').getContext('2d');
    if (chart) chart.destroy();
    
    chart = new Chart(ctx, {
        type: 'bar', // Req ID 1.1: Bar Chart
        data: {
            labels: labels,
            datasets: [{
                label: currentMeasure,
                data: data,
                backgroundColor: '#0079c1',
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    min: 0, // Req ID 1.7: No negative values
                    title: {
                        display: true,
                        text: currentMeasure // Req ID 1.5: Axis label
                    }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}
