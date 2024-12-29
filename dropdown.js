const syYearSelect = document.getElementById("syYear");
const currentYear = new Date().getFullYear();

for (let year = 2020; year <= currentYear + 1; year++) {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = year;
    syYearSelect.appendChild(option);
}

syYearSelect.value = currentYear;
