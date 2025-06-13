import settingsReducer, { setSettings, clearSettings } from '../../src/redux/slices/settingsSlice';

const initialState = {
  employerSettings: {
    showVehiclesTabInSidebar: undefined,
    tabletViewRecordingType: 'Automatically Record',
    tabletViewPasswordRequired: false,
    timesheetStartDayOfWeek: 'Monday',
    timesheetStartDate: null,
    timesheetIsLunchBreakDefault: true,
    isTravelChargeByDefault: true,
    is24Hour: false,
    isProjectClient: false,
    isNoteNeeded: false,
    isWorkPerformed: false,
    reassignTimesheet: true,
    showXero: false,
    showLocation: false,
    employeeCanCreateProject: true,
    narrowTitles: true,
    timesheetHideWage: false,
    defaultTimesheetViewType: 'Weekly',
    reportColumns: [],
  },
  status: 'idle',
  error: null,
};

describe('settingsSlice reducer', () => {
  it('should return the initial state', () => {
    expect(settingsReducer(undefined, { type: undefined })).toEqual(initialState);
  });
});
