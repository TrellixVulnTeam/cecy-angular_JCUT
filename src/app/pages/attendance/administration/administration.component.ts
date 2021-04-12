import {Component, OnInit, ViewEncapsulation} from '@angular/core';
import {Router} from '@angular/router';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {ConfirmationService, Message, MessageService, PrimeNGConfig} from 'primeng/api';
import {BreadcrumbService} from '../../../shared/breadcrumb.service';
import {NgxSpinnerService} from 'ngx-spinner';
import {AttendanceService} from '../../../services/attendance/attendance.service';
import {Attendance, Workday, Task} from '../../../models/attendance/models.index';
import {User, Role} from '../../../models/auth/models.index';
import {Event, Col} from '../../../models/setting/models.index';
import * as moment from 'moment';
import {environment} from '../../../../environments/environment';
import {Institution} from '../../../models/ignug/institution';
import {HttpParams} from '@angular/common/http';
import * as fileSaver from 'file-saver';


@Component({
    selector: 'app-administration-laboral',
    templateUrl: './administration.component.html',
    styleUrls: ['administration.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class AdministrationComponent implements OnInit {
    user: User;
    role: Role;
    processes: any[];
    activities: any[];
    colsActivies: Col[];
    selectedActivity: Workday;
    currentDate: any;
    selectedDate: Date;
    optionsFullCalendar: any;
    attendances: Attendance[];
    attendance: Attendance;
    workday: Workday;
    task: Task;
    msgs: Message[];
    msgsErrors: Message[];
    checked: boolean;
    events: Event[];
    selectedTask: Task;
    formTask: FormGroup;
    selectedTab: number;
    displayFormTask: boolean;
    dataAttendances: any;
    dataActivities: any;
    optionsChartAttendances: any;
    optionsChartActivities: any;
    STORAGE_URL: string = environment.STORAGE_URL;
    usersWorkdays: User[];
    users: User[];
    usersActivities: User[];
    totalAttendances: number;
    selectedValue: string;
    searchUserWorkdays: string;
    searchUserActivities: string;
    selectedUser: User;
    formWorkday: FormGroup;
    dialogFormStartWorkday: boolean;
    dialogFormEndWorkday: boolean;
    dialogFormTask: boolean;
    dialogFormWorkday: boolean;
    institution: Institution;
    selectedDates: Date;
    selectedStartDate: Date;
    selectedEndDate: Date;

    constructor(private _breadcrumbService: BreadcrumbService,
                private _attendanceService: AttendanceService,
                private _spinner: NgxSpinnerService,
                private _router: Router,
                private _fb: FormBuilder,
                private messageService: MessageService,
                private primengConfig: PrimeNGConfig,
                private _confirmationService: ConfirmationService) {
        this._breadcrumbService.setItems([
            {label: 'Dashboard', routerLink: '/dashboard'},
            {label: 'Administración Asistencia'},
        ]);
        this.primengConfig.ripple = true;
        this.role = JSON.parse(localStorage.getItem('role')) as Role;
        this.user = JSON.parse(localStorage.getItem('user')) as User;
        this.institution = JSON.parse(localStorage.getItem('institution')) as Institution;
        this.usersWorkdays = [{institutions: [], attendance: {workdays: [{type: {}}], tasks: []}}];
        this.usersActivities = [{institutions: [], attendance: {workdays: [{type: {}}], tasks: []}}];
        this.users = [{attendance: {workdays: [{type: {}}], tasks: []}}];
        this.colsActivies = [
            {field: 'name', header: 'ACTIVIDAD'}
        ];
        this.attendances = [{workdays: [{type: {}}], tasks: [], attendanceable: {}}];
        this.totalAttendances = 0;
        this.processes = [];
        this.selectedTab = 0;
        this.selectedTask = {type: {}};
        this.selectedDate = new Date();
        this.currentDate = moment();
        this.selectedValue = 'ABSENT';
        this.selectedUser = {};
        this.searchUserWorkdays = '';
        this.searchUserActivities = '';
    }

    ngOnInit() {
        this.getProcesses();
        this.getAttendances();
        this.buildFormWorkday();
        this.buildFormTask();
        this.fillChartActivities();
    }

    buildFormWorkday() {
        this.formWorkday = this._fb.group({
            id: [],
            description: [''],
            start_time: [''],
            end_time: [''],
            user: [''],
            type: [''],
            observation: ['', Validators.required],
        });
    }

    buildFormTask() {
        this.formTask = this._fb.group({
            percentage_advance: ['100', Validators.required],
            observation: ['', Validators.required]
        });
    }

    getAttendances() {
        const params = new HttpParams().append('institution_id', this.institution.id.toString());
        this._spinner.show();
        this._attendanceService.post('attendances/current_day', {date: this.selectedDate.toDateString()}, params)
            .subscribe(response => {
                this._spinner.hide();
                this.users = response['data'];
                if (this.users) {
                    this.users = this.users.filter(element => element.institutions.length > 0);
                    this.usersActivities = response['data'];
                    this.usersActivities = this.usersActivities.filter(element => element.institutions.length > 0);
                    this.totalAttendances = 0;
                    this.users.forEach(user => {
                        if (user.attendance !== null) {
                            this.totalAttendances++;
                        }
                    });
                    this.fillChartAttendances();
                    this.selectFilter();
                }
            }, error => {
                this._spinner.hide();
                this.msgsErrors = [{
                    severity: 'error',
                    summary: error.error.msg.summary,
                    detail: error.error.msg.detail,
                }];
            });
    }

    selectFilter() {
        switch (this.selectedValue) {
            case 'ABSENT':
                this.showMissing();
                break;
            case 'PRESENT':
                this.showPresent();
                break;
            case 'NO_WORK':
                this.showNoWork();
                break;
            case 'NO_LUNCH':
                this.showNoLunch();
                break;
        }
    }


    createOrUpdateTask() {
        this.selectedTask.percentage_advance = this.formTask.controls['percentage_advance'].value;
        this.selectedTask.observation = this.formTask.controls['observation'].value;
        this.selectedTask.description = '';
        this.formTask.controls['percentage_advance'].setValue('1');
        this.formTask.controls['observation'].setValue('');
        const params = new HttpParams()
            .append('institution_id', this.institution.id.toString())
            .append('user_id', this.selectedUser.id.toString())
            .append('date', this.selectedDate.getFullYear() + '-' + (this.selectedDate.getMonth() + 1) + '-' + this.selectedDate.getDate());

        this._spinner.show();
        this._attendanceService.post('attendances/register_tasks', {task: this.selectedTask}, params).subscribe(response => {
            this._spinner.hide();
            this.displayFormTask = false;
            this.attendance = response['data'];
            this.getAttendances();
            this.fillChartActivities();
            this.messageService.add({
                key: 'msgToast',
                severity: 'success',
                summary: response['msg']['summary'],
                detail: response['msg']['detail']
            });
        }, error => {
            this._spinner.hide();
            this.messageService.add({
                key: 'msgToast',
                severity: 'error',
                summary: error.error.msg.summary,
                detail: error.error.msg.detail,
            });
        });
    }

    deleteTask(task: Task) {
        this._confirmationService.confirm({
            message: '¿Está seguro de eliminar el registro?',
            header: 'Confirmiación de elimnación',
            icon: 'pi pi-trash',
            rejectButtonStyleClass: 'p-button-text',
            accept: () => {
                this._spinner.show();
                this._attendanceService.delete('tasks/' + task.id).subscribe(response => {
                    this._spinner.hide();
                    this.getAttendances();
                    this.messageService.add({
                        key: 'msgToast',
                        severity: 'success',
                        summary: response['msg']['summary'],
                        detail: response['msg']['detail']
                    });
                }, error => {
                    this._spinner.hide();
                    this.msgsErrors = [{
                        severity: 'error',
                        summary: error.error.msg.summary,
                        detail: error.error.msg.detail,
                    }];
                });
            },
            reject: () => {

            }
        });
    }

    updateWorkday() {
        this.workday = {
            id: this.formWorkday.controls['id'].value,
            start_time: this.formWorkday.controls['start_time'].value,
            end_time: this.formWorkday.controls['end_time'].value,
            observation: this.formWorkday.controls['observation'].value
        };
        this._spinner.show();
        this._attendanceService.update('attendances/day', {workday: this.workday}).subscribe(response => {
            this._spinner.hide();
            this.attendance = response['data'];
            this.getAttendances();
        }, error => {
            this._spinner.hide();
            this.msgsErrors = [{
                severity: 'error',
                summary: error.error.msg.summary,
                detail: error.error.msg.detail,
            }];
        });
    }

    startWorkday() {
        this.workday = {
            description: this.formWorkday.controls['description'].value,
            start_time: this.formWorkday.controls['start_time'].value,
            type: this.formWorkday.controls['type'].value,
            observation: this.formWorkday.controls['observation'].value
        };
        const params = new HttpParams()
            .append('institution_id', this.institution.id.toString())
            .append('user_id', this.selectedUser.id.toString());
        this._spinner.show();
        this._attendanceService.post('attendances/start_day', {
            workday: this.workday,
            date: this.selectedDate.toDateString()
        },params).subscribe(response => {
            this._spinner.hide();
            this.attendance = response['data'];
            this.getAttendances();
        }, error => {
            this._spinner.hide();
            this.msgsErrors = [{
                severity: 'error',
                summary: error.error.msg.summary,
                detail: error.error.msg.detail,
            }];
        });
    }

    endWorkday() {
        this.workday = {
            id: this.formWorkday.controls['id'].value,
            end_time: this.formWorkday.controls['end_time'].value,
            observation: this.formWorkday.controls['observation'].value
        };
        this._spinner.show();
        this._attendanceService.update('attendances/end_day', {workday: this.workday}).subscribe(response => {
            this._spinner.hide();
            this.attendance = response['data'];
            this.getAttendances();
        }, error => {
            this._spinner.hide();
            this.msgsErrors = [{
                severity: 'error',
                summary: error.error.msg.summary,
                detail: error.error.msg.detail,
            }];
        });
    }

    getProcesses() {
        this._attendanceService.get('attendances/processes').subscribe(response => {
            this.processes = response['data'];
        }, error => {
            this.msgsErrors = [{
                severity: 'error',
                summary: error.error.msg.summary,
                detail: error.error.msg.detail,
            }];
        });
    }

    selectActivity(activity) {
        console.log(activity);
    }

    changeIndex(event) {
        this.selectedTab = event.index;
    }

    onSubmitTask(event) {
        event.preventDefault();
        if (this.formTask.valid) {
            this.createOrUpdateTask();
        } else {
            this.formTask.markAllAsTouched();
        }
    }

    fillChartAttendances() {
        this.dataAttendances = {
            labels: ['Presentes: ' + this.totalAttendances, 'Ausentes: ' + (this.users.length - this.totalAttendances)],
            datasets: [
                {
                    data: [this.totalAttendances, this.users.length - this.totalAttendances],
                    backgroundColor: ['#64b5f6', '#cfd8dc']
                }]
        };
        this.optionsChartAttendances = {
            legend: {
                position: 'left'
            },

        };
    }

    fillChartActivities() {
        this._spinner.show();
        const params = new HttpParams().append('institution_id', this.institution.id.toString());
        this._attendanceService.get('attendances/total_processes', params).subscribe(response => {
            this._spinner.hide();
            const data = response['data']['data'];
            const labels = response['data']['labels'];
            const backgroundColor = response['data']['background_color'];
            for (let i = 0; i < data.length; i++) {
                labels[i] = labels[i] + ': ' + data[i];
            }
            this.dataActivities = {
                labels,
                datasets: [
                    {
                        data,
                        backgroundColor
                    }]
            };
            this.optionsChartActivities = {
                legend: {
                    position: 'left'
                },

            };
        }, error => {
            this._spinner.hide();
            this.msgsErrors = [{
                severity: 'error',
                summary: error.error.msg.summary,
                detail: error.error.msg.detail,
            }];
        });
    }

    showMissing() {
        this.usersWorkdays = this.users.filter(user => user.attendance === null);
    }

    showPresent() {
        this.usersWorkdays = this.users.filter(user => user.attendance !== null);
    }

    showNoWork() {
        this.usersWorkdays = this.users.filter(this.filterNoWork);
    }

    filterNoWork(user) {
        if (user.attendance) {
            let flagWorkday = true;
            for (const item of user.attendance.workdays) {
                if (item.type.code === 'WORK') {
                    flagWorkday = item.end_time === null;
                }
            }
            return flagWorkday;
        }
    }

    showNoLunch() {
        this.usersWorkdays = this.users.filter(this.filterNoLunch);
    }

    filterNoLunch(user) {
        if (user.attendance) {
            let flagWorkday = false;
            for (const item of user.attendance.workdays) {
                if (item.type.code === 'LUNCH') {
                    flagWorkday = item.end_time === null;
                }
            }
            return flagWorkday;
        }
    }

    findUserWorkdays() {
        if (this.searchUserWorkdays.length === 0) {
            this.selectFilter();
            return;
        }
        this.usersWorkdays = this.users.filter(user => {
            return (
                    user.first_lastname
                    + ' ' + user.second_lastname
                    + ' ' + user.first_name
                    + ' ' + user.second_name
                )
                    .toLocaleLowerCase().includes(this.searchUserWorkdays.toLocaleLowerCase()) ||
                (
                    user.first_name
                    + ' ' + user.second_name
                    + ' ' + user.first_lastname
                    + ' ' + user.second_lastname
                )
                    .toLocaleLowerCase().includes(this.searchUserWorkdays.toLocaleLowerCase()) ||
                user.identification.toLocaleLowerCase().includes(this.searchUserWorkdays.toLocaleLowerCase()) ||
                user.email.toLocaleLowerCase().includes(this.searchUserWorkdays.toLocaleLowerCase());
        });
    }

    findUserActivities() {
        if (this.searchUserActivities.length === 0) {
            this.selectFilter();
            return;
        }
        this.usersActivities = this.users.filter(user => {
            return (
                    user.first_lastname
                    + ' ' + user.second_lastname
                    + ' ' + user.first_name
                    + ' ' + user.second_name
                )
                    .toLocaleLowerCase().includes(this.searchUserActivities.toLocaleLowerCase()) ||
                (
                    user.first_name
                    + ' ' + user.second_name
                    + ' ' + user.first_lastname
                    + ' ' + user.second_lastname
                )
                    .toLocaleLowerCase().includes(this.searchUserActivities.toLocaleLowerCase()) ||
                user.identification.toLocaleLowerCase().includes(this.searchUserActivities.toLocaleLowerCase()) ||
                user.email.toLocaleLowerCase().includes(this.searchUserActivities.toLocaleLowerCase());
        });
    }

    openModalStartWorkday(user: User) {
        this.selectedUser = user;
        this.formWorkday.controls['start_time'].setValue(moment().format('LT'));
        this.formWorkday.controls['observation'].setValue('');
        this.formWorkday.controls['type'].setValue({code: 'WORK'});
        this.formWorkday.controls['description'].setValue('JORNADA');
        this.dialogFormStartWorkday = true;
    }

    onSubmitStartWorkday(event: Event) {
        // event.preventDefault();
        if (this.formWorkday.valid) {
            this.startWorkday();
            this.dialogFormStartWorkday = false;
        } else {
            this.formWorkday.markAllAsTouched();
        }
    }

    openModalEndWorkday(user: User, workday: Workday) {
        this.formWorkday.controls['id'].setValue(workday.id);
        this.formWorkday.controls['end_time'].setValue(moment().format('LT'));
        this.formWorkday.controls['observation'].setValue('');
        this.dialogFormEndWorkday = true;
    }

    onSubmitEndWorkday(event: Event) {
        // event.preventDefault();
        if (this.formWorkday.valid) {
            this.endWorkday();
            this.dialogFormEndWorkday = false;
        } else {
            this.formWorkday.markAllAsTouched();
        }
    }

    openModalWorkday(user: User, workday: Workday) {
        this.formWorkday.controls['id'].setValue(workday.id);
        this.formWorkday.controls['observation'].setValue('');
        this.formWorkday.controls['start_time'].setValue(workday.start_time);
        this.formWorkday.controls['end_time'].setValue(workday.end_time);
        this.dialogFormWorkday = true;
    }

    onSubmitWorkday(event: Event) {
        // event.preventDefault();
        if (this.formWorkday.valid) {
            this.updateWorkday();
            this.dialogFormWorkday = false;
        } else {
            this.formWorkday.markAllAsTouched();
        }
    }

    selectInstitution(institution: Institution) {
        this.institution = institution;
        this.getAttendances();
        this.fillChartActivities();
    }

    generateAttendancesReport() {
        const params = new HttpParams()
            .append('start_date', this.selectedStartDate.getFullYear() + '-' + (this.selectedStartDate.getMonth() + 1) + '-' + this.selectedStartDate.getDate())
            .append('end_date', this.selectedEndDate.getFullYear() + '-' + (this.selectedEndDate.getMonth() + 1) + '-' + this.selectedEndDate.getDate())
            .append('institution_id', this.institution.id.toString());
        this._spinner.show();
        this._attendanceService.report('attendances', params).subscribe(response => {
            this._spinner.hide();
            const blob = new Blob([response as Blob], {type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
            const date = moment(this.selectedDate).format('MMMM - YYYY').toUpperCase();
            const fileName = 'INFORME DE ASISTENCIA ' + this.institution.short_name + ' (' + date + ').xlsx';
            fileSaver.saveAs(blob, fileName);
        }, error => {
            this._spinner.hide();
            this.messageService.add({
                key: 'msgToast',
                severity: 'error',
                summary: error.error.msg.summary,
                detail: error.error.msg.detail,
            });
        });
    }

    generateTasksReport() {
        const params = new HttpParams()
            .append('start_date', this.selectedStartDate.getFullYear() + '-' + (this.selectedStartDate.getMonth() + 1) + '-' + this.selectedStartDate.getDate())
            .append('end_date', this.selectedEndDate.getFullYear() + '-' + (this.selectedEndDate.getMonth() + 1) + '-' + this.selectedEndDate.getDate())
            .append('institution_id', this.institution.id.toString());
        this._spinner.show();
        this._attendanceService.report('tasks', params).subscribe(response => {
            this._spinner.hide();
            const blob = new Blob([response as Blob], {type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
            const date = moment(this.selectedDate).format('MMMM - YYYY').toUpperCase();
            const fileName = 'INFORME DE ACTIVIDADES ' + this.institution.short_name + ' (' + date + ').xlsx';
            fileSaver.saveAs(blob, fileName);
        }, error => {
            this._spinner.hide();
            this.messageService.add({
                key: 'msgToast',
                severity: 'error',
                summary: error.error.msg.summary,
                detail: error.error.msg.detail,
            });
        });
    }
}

