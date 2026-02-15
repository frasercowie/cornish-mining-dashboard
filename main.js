require([
    "esri/config",
    "esri/WebMap",
    "esri/views/MapView",
    "esri/layers/FeatureLayer"
], function(esriConfig, WebMap, MapView, FeatureLayer) {

    esriConfig.apiKey = "AAPTxy8BH1VEsoebNVZXo8HurKAZB3sRp7Z830yYH3o73I_zpEaiQsJmfHCUr-e1yHpimExTT_K7fkezDCAGUhxqQf8fFChRPquaw86R_-kq7h46jzvgTfTJHK-CbEOTW4I7XD1_Ddicnwd5FBz1Gfx7XwYftYjTQlqsrd-pR8CmPo0Qk9mT-6LTIabau5RUyqZMPIKG9GLjdvXkAYcsI4XhEmNTf3aPunK5ryKEUIPu7C8.AT1_QogzFqVY";

    let chart;

    // 1. Load the WebMap (this restores your AGOL colors, basemap, and popups)
    const webmap = new WebMap({
        portalItem: { id: "af53f741d9814c088bb9b76bc36ee81a" }
    });

    const view = new MapView({
        container: "viewDiv",
        map: webmap
    });

    // 2. Reference the Table (CSV) separately
    const productionTable = new FeatureLayer({
        portalItem: { id: "25692f8846fc4053a7e37b767fa63be1" },
        outFields: ["*"] 
    });

    // 3. The "Field Enforcer" 
    // This waits for the WebMap to load, then forces the Locations layer to fetch all data.
    webmap.when(() => {
        const locationsLayer = webmap.layers.find(l => l.title.includes("Locations"));
        if (locationsLayer) {
            locationsLayer.outFields = ["Mine_ID", "Mine_Name", "mine_id", "mine_name"];
            console.log("WebMap loaded. Locations layer fields forced to 'Visible'.");
        }
    });

    view.on("click", (event) => {
        view.hitTest(event).then((response) => {
            const hit = response.results.find(r => 
                r.graphic && r.graphic.layer && r.graphic.layer.title.includes("Locations")
            );

            if (hit) {
                const attrs = hit.graphic.attributes;
                const name = attrs.Mine_Name || attrs.mine_name || "Mine Name Missing";
                const id = attrs.Mine_ID || attrs.mine_id;

                document.getElementById("mineName").innerText = name;
                document.getElementById("instruction").style.display = "none";
                if (id) { updateProductionData(id); }
            }
        });
    });

    function updateProductionData(mineId) {
        const query = productionTable.createQuery();
        query.where = `Mine_ID = '${mineId}' OR mine_id = '${mineId}'`;
        query.outFields = ["*"];
        query.orderByFields = ["Year ASC"];

        productionTable.queryFeatures(query).then((result) => {
            const features = result.features;
            const labels = features.map(f => f.attributes.Year || f.attributes.year);
            const data = features.map(f => f.attributes.Ore_Tons || f.attributes.ore_tons || 0);

            if (features.length > 0) {
                document.getElementById("results").innerHTML = `<p>Data found for ${features.length} years.</p>`;
                renderChart(labels, data);
            } else {
                document.getElementById("results").innerHTML = "<p>No production records found.</p>";
                if (chart) chart.destroy();
            }
        });
    }

    function renderChart(labels, data) {
        const ctx = document.getElementById('productionChart').getContext('2d');
        if (chart) chart.destroy();
        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Ore Production (Tons)',
                    data: data,
                    borderColor: '#0079c1',
                    fill: true,
                    tension: 0.4
                }]
            }
        });
    }
});