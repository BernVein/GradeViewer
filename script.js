const fetchGrades = async () => {
    const gradesTableBody = document.querySelector("#gradesTable tbody");
    const schoolYearInfo = document.getElementById("schoolYearInfo");
    const errorMessage = document.getElementById("errorMessage");
    const syYear = document.getElementById("syYear").value;
    const syPeriod = document.getElementById("syPeriod").value;
    const gpaDisplay = document.getElementById("gpaDisplay");

    gradesTableBody.innerHTML = "";
    schoolYearInfo.innerHTML = "";
    errorMessage.style.display = "none";
    gpaDisplay.textContent = "";

    const loadingOverlay = document.getElementById("loadingOverlay");
    loadingOverlay.style.display = "flex";
    // Fetches the token from the extension (stored token fetched by content_script.js)
    try {
        const { token } = await new Promise((resolve) =>
            chrome.storage.local.get("token", (result) => {
                console.log("Script.js: Retrieved token from storage:", result.token);
                resolve(result);
            })
        );

        if (!token) throw new Error("Token not found. Please log in.");

        console.log("Script.js: Using token:", token);

        const response = await fetch(
            `https://c1-student.vsu.edu.ph/api/students/grades?sy_year=${syYear}&sy_period=${syPeriod}`,
            {
                headers: {
                    "Accept": "application/json",
                    "Authorization": `Token token=${token}`,
                },
            }
        );

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error("Please login (if not logged in) and refresh the page.");
            } else if (response.status === 404) {
                throw new Error("Data not found for the selected year/semester.");
            } else if (response.status === 500) {
                throw new Error("There is no data for the selected year/semester.");
            } else {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
        }

        const data = await response.json();

        loadingOverlay.style.display = "none";

        const tableHead = document.querySelector("#gradesTable thead tr");
        tableHead.innerHTML = `
            <th>Subject</th>
            <th>Midterm</th>
            <th>Estimated Finals Grade</th>
            <th>Final Grade</th>
            <th>Remark</th>
            <th>Pending</th>
            <th>Instructor</th>
        `;

        let totalUnits = 0;
        let weightedGrades = 0;

        data.grades.forEach((item) => {
            const midtermGrade = item.grade.midterm !== null ? parseFloat(item.grade.midterm) : null;
            const finalGrade = item.grade.final !== null ? parseFloat(item.grade.final) : null;
            const subjectUnits = item.offer.subject.units !== null ? parseFloat(item.offer.subject.units) : 0;

            if (midtermGrade === null && finalGrade === null) {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${item.offer.subject.description}</td>
                    <td>No grade</td>
                    <td>No grade</td>
                    <td>No grade</td>
                    <td>No grade</td>
                    <td>${item.grade.credited ? "No" : "Yes"}</td>
                    <td>${item.offer.staff.fullname}</td>
                `;
                gradesTableBody.appendChild(row);
                return; 
            }

            if (!isNaN(finalGrade) && !isNaN(subjectUnits)) {
                weightedGrades += finalGrade * subjectUnits;
                totalUnits += subjectUnits;
            }

            const estimatedFinalsGrade = (2 * (finalGrade || 0)) - (midtermGrade || 0); 

            const row = document.createElement("tr");

            const midtermCell = document.createElement("td");
            midtermCell.textContent = midtermGrade !== null ? midtermGrade.toFixed(2) : "No grade";
            midtermCell.style.color = (isNaN(midtermGrade) ? "red" : (midtermGrade < 1.0 ? "#8f00ff" : (midtermGrade > 5.0 ? "purple" : (midtermGrade > 3.0 ? "red" : "green"))));

            const estimatedFinalsCell = document.createElement("td");
            estimatedFinalsCell.textContent = estimatedFinalsGrade.toFixed(2) || "No grade";
            estimatedFinalsCell.style.color = (isNaN(estimatedFinalsGrade) ? "red" : (estimatedFinalsGrade < 1.0 ? "#8f00ff" : (estimatedFinalsGrade > 5.0 ? "purple" : (estimatedFinalsGrade > 3.0 ? "red" : "green"))));

            const finalGradeCell = document.createElement("td");
            finalGradeCell.textContent = finalGrade !== null ? finalGrade.toFixed(2) : "No grade";
            finalGradeCell.style.color = (isNaN(finalGrade) ? "red" : (finalGrade < 1.0 ? "#8f00ff" : (finalGrade > 5.0 ? "purple" : (finalGrade > 3.0 ? "red" : "green"))));

            const remarkCell = document.createElement("td");
            const remarkText = item.grade.remark || "No grade";
            remarkCell.textContent = remarkText;

            remarkCell.style.color = remarkText.toLowerCase() === "passed" ? "green" : "red";

            row.innerHTML = `
                <td>${item.offer.subject.description}</td>
            `;
            row.appendChild(midtermCell); 
            row.appendChild(estimatedFinalsCell); 
            row.appendChild(finalGradeCell); 
            row.appendChild(remarkCell);
            row.innerHTML += `
                <td>${item.grade.credited ? "No" : "Yes"}</td>
                <td>${item.offer.staff.fullname}</td>
            `;

            gradesTableBody.appendChild(row);
        });

        if (totalUnits > 0) {
            const gpa = (weightedGrades / totalUnits).toFixed(2);
            gpaDisplay.textContent = `Estimated GPA: ${gpa}`;
        } else {
            gpaDisplay.textContent = "GPA: N/A";
        }

    } catch (error) {
        console.error("Error fetching grades:", error);
        errorMessage.textContent = error.message;
        errorMessage.style.display = "block";
        loadingOverlay.style.display = "none";
    }
};

document.getElementById("syYear").addEventListener("change", fetchGrades);
document.getElementById("syPeriod").addEventListener("change", fetchGrades);

document.addEventListener("DOMContentLoaded", () => {
    const syYearSelect = document.getElementById("syYear");
    const currentYear = new Date().getFullYear();

    for (let year = 2020; year <= currentYear + 1; year++) {
        const option = document.createElement("option");
        option.value = year;
        option.textContent = year;
        syYearSelect.appendChild(option);
    }

    syYearSelect.value = currentYear; 

    const gpaElement = document.createElement("div");
    gpaElement.id = "gpaDisplay";
    gpaElement.style.margin = "10px 0";
    gpaElement.style.fontWeight = "bold";
    gpaElement.style.textAlign = "center";
    gpaElement.style.fontSize = "20px";
    const gradesContainer = document.querySelector("#gradesTable").parentNode;
    gradesContainer.insertBefore(gpaElement, gradesContainer.querySelector("#gradesTable"));

    fetchGrades();
});
