/* BWL-App/app.js - App-spezifische Initialisierung */

document.addEventListener('DOMContentLoaded', () => {
    // UI-Elemente für diese spezifische App-Instanz definieren
    const ui_elements = {
        btnRefresh: document.getElementById("btn-refresh"),
        chkExternal: document.querySelector("#showExternal"),
        btnLearn: document.getElementById("btnLearn"),
        btnTest: document.getElementById("btnTest"),
        list: document.getElementById("list"),
    };

    // Die Hauptanwendung instanziieren und starten
    const app = new LernApp(ui_elements);
    app.init();
});
