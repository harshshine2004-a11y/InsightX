const SUGGESTIONS_MAP: { [shorthand: string]: string } = {
  'reg no': 'Registration Number',
  'reg_no': 'Registration Number',
  'regno': 'Registration Number',
  'att %': 'Attendance Percentage',
  'attendance %': 'Attendance Percentage',
  'att_pct': 'Attendance Percentage',
  'attpct': 'Attendance Percentage',
  'dept': 'Department',
  'dob': 'Date of Birth',
  'sem': 'Semester',
  'mob': 'Mobile Number',
  'ph': 'Mobile Number',
  'tel': 'Mobile Number',
  'mobile': 'Mobile Number',
  'qty': 'Quantity',
  'amt': 'Amount',
  'gndr': 'Gender',
  'mgr': 'Manager',
  'desc': 'Description',
  'cat': 'Category',
  'emp': 'Employee ID',
  'empid': 'Employee ID',
  'sal': 'Salary',
  'rev': 'Revenue',
  'val': 'Value',
  'id': 'Identifier',
  'std': 'Student',
  'stud': 'Student',
  'addr': 'Address',
  'loc': 'Location'
};

export function getSmartSuggestion(header: string): string {
  const normalized = header.toLowerCase().trim();
  
  // Try exact lookup
  if (SUGGESTIONS_MAP[normalized]) {
    return SUGGESTIONS_MAP[normalized];
  }
  
  // Try cleaning prefixes/suffixes
  // e.g. "student dob" or "dept_id"
  for (const [key, replacement] of Object.entries(SUGGESTIONS_MAP)) {
    // If the shorthand is a word boundary match
    const regex = new RegExp(`\\b${key}\\b`, 'i');
    if (regex.test(normalized)) {
      return normalized.replace(regex, replacement).replace(/\b\w/g, c => c.toUpperCase());
    }
  }

  // Capitalize words as fallback suggestion
  return header
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}
