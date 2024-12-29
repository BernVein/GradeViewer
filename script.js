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
        // Format sa pag fetch: grades?sy_year=${Current Year}&sy_period=${1st sem = 1, 2nd sem = 2}
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
            const midtermGrade = parseFloat(item.grade.midterm);
            const finalGrade = parseFloat(item.grade.final);
            const subjectUnits = parseFloat(item.offer.subject.units);

            if (!isNaN(finalGrade) && !isNaN(subjectUnits)) {
                weightedGrades += finalGrade * subjectUnits;
                totalUnits += subjectUnits;
            }
            // Estimated Finals Grade is assuming na ang grading system is 50% midterm, 50% finals
            const estimatedFinalsGrade = (2 * finalGrade) - midtermGrade;

            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${item.offer.subject.description}</td>
                <td>${midtermGrade.toFixed(2) || "N/A"}</td>
                <td>${estimatedFinalsGrade.toFixed(2) || "N/A"}</td>
                <td>${finalGrade.toFixed(2) || "N/A"}</td>
                <td>${item.grade.remark}</td>
                <td>${item.grade.credited ? "No" : "Yes"}</td>
                <td>${item.offer.staff.fullname}</td>
            `;

            const midtermCell = row.querySelector("td:nth-child(2)");
            const estimatedFinalsCell = row.querySelector("td:nth-child(3)");
            const finalGradeCell = row.querySelector("td:nth-child(4)");
            const remarkCell = row.querySelector("td:nth-child(5)");

            if (isNaN(midtermGrade) || midtermGrade > 3.0) {
                midtermCell.style.color = "red";
            } else {
                midtermCell.style.color = "green";
            }

            if (isNaN(estimatedFinalsGrade) || estimatedFinalsGrade > 3.0) {
                estimatedFinalsCell.style.color = "red";
            } else {
                estimatedFinalsCell.style.color = "green";
            }

            if (isNaN(finalGrade) || finalGrade > 3.0) {
                finalGradeCell.style.color = "red";
            } else {
                finalGradeCell.style.color = "green";
            }

            if (item.grade.remark.toLowerCase() === "passed") {
                remarkCell.style.color = "green";
            } else {
                remarkCell.style.color = "red";
            }

            [midtermCell, estimatedFinalsCell, finalGradeCell].forEach((cell) => {
                const grade = parseFloat(cell.textContent);
                if (!isNaN(grade) && grade < 1.0) {
                    cell.style.color = "#8B00FF"; 
                    cell.title = "Suspicious grade, basin gi magic magic";
                }
            });

            gradesTableBody.appendChild(row);
        });
        
        if (totalUnits > 0) {
            // GPA calculation according to BSCS pres 2024 -> (Units * final grade) + ... n / totalUnits
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
