import React, { useState, useEffect, useCallback } from 'react';
// Imports do Firebase
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, getDocs, query, where, doc, Timestamp, updateDoc, onSnapshot } from 'firebase/firestore';
// Imports de Ícones
import { Users, UserPlus, CreditCard, CalendarClock, AlertTriangle, CheckCircle, XCircle, TrendingUp, PlusCircle, Trash2, Eye, ShieldCheck, ShieldOff, DollarSign, LogIn, LogOut, BarChart2, Calendar as CalendarIcon, Printer, Heart, UsersRound, FileWarning, Edit } from 'lucide-react';

// --- Configuração do Firebase (Injetada pelo ambiente) ---
const firebaseConfigJson = typeof __firebase_config !== 'undefined' ? __firebase_config : '{}';
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-policardmed-app';
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

let firebaseConfig = {};
try { firebaseConfig = JSON.parse(firebaseConfigJson); } 
catch (e) { console.error("Erro ao processar a configuração do Firebase:", e); }


// --- Inicialização dos Serviços Firebase ---
let app;
let authInstance; 
let dbInstance; 

try {
    if (firebaseConfig && firebaseConfig.apiKey) {
        app = initializeApp(firebaseConfig);
        authInstance = getAuth(app);
        dbInstance = getFirestore(app);
    } else {
        console.error("Configuração do Firebase ausente ou inválida.");
    }
} catch (error) {
    console.error("Erro crítico ao inicializar o Firebase:", error);
}

// --- Componente Principal da Aplicação ---
const PolicardmedApp = () => {
    const [authStatus, setAuthStatus] = useState({ loggedIn: false, role: null, data: null }); // role: 'admin' | 'associate'
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!authInstance) {
            setIsLoading(false);
            return;
        }
        const unsubscribe = onAuthStateChanged(authInstance, (user) => {
            if (!user) {
                // Tenta login anônimo para operações de fundo, mas não define como logado
                signInAnonymously(authInstance).catch(e => console.error("Falha no login anônimo de fundo", e));
            }
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleLogin = (role, data) => {
        setAuthStatus({ loggedIn: true, role, data });
    };

    const handleLogout = () => {
        setAuthStatus({ loggedIn: false, role: null, data: null });
        if (authInstance) {
            signOut(authInstance); // Opcional, para limpar o estado de auth do Firebase
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-lg text-gray-700">A carregar...</p>
            </div>
        );
    }

    if (!authStatus.loggedIn) {
        return <LoginPage onLogin={handleLogin} />;
    }

    if (authStatus.role === 'admin') {
        return <AdminPanel onLogout={handleLogout} />;
    }
    
    if (authStatus.role === 'associate') {
        return <AssociatePanel memberData={authStatus.data} onLogout={handleLogout} />;
    }

    return null; // Fallback
};


// --- PÁGINA DE LOGIN ---
const LoginPage = ({ onLogin }) => {
    const [loginType, setLoginType] = useState('admin'); // 'admin' ou 'associate'
    const [cpf, setCpf] = useState('');
    const [adminUser, setAdminUser] = useState('');
    const [adminPass, setAdminPass] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleAdminLogin = (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        // SIMULAÇÃO: Em um app real, isso seria uma chamada segura de autenticação
        if (adminUser === 'admin@policardmed.com' && adminPass === 'admin123') {
            onLogin('admin', { email: adminUser });
        } else {
            setError('Credenciais de administrador inválidas.');
        }
        setIsLoading(false);
    };

    const handleAssociateLogin = async (e) => {
        e.preventDefault();
        setError('');
        if (!cpf.trim()) {
            setError('Por favor, insira o seu CPF.');
            return;
        }
        setIsLoading(true);
        try {
            const q = query(collection(dbInstance, `/artifacts/${appId}/public/data/policardmed_members`), where("cpf", "==", cpf.trim()));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                setError("Nenhum associado encontrado com este CPF.");
            } else {
                const memberData = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
                onLogin('associate', memberData);
            }
        } catch (err) {
            console.error("Erro ao buscar associado:", err);
            setError("Erro ao verificar CPF. Tente novamente.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-md">
                <div className="text-4xl font-bold text-center text-blue-600 mb-8">Policardmed</div>
                <div className="bg-white rounded-xl shadow-2xl p-8">
                    <div className="flex border-b border-gray-200 mb-6">
                        <button onClick={() => setLoginType('admin')} className={`flex-1 py-3 text-center font-semibold transition-all ${loginType === 'admin' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}>
                            Administrativo
                        </button>
                        <button onClick={() => setLoginType('associate')} className={`flex-1 py-3 text-center font-semibold transition-all ${loginType === 'associate' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}>
                            Associado
                        </button>
                    </div>

                    {error && <p className="bg-red-100 text-red-700 p-3 rounded-md text-sm mb-4">{error}</p>}
                    
                    {loginType === 'admin' ? (
                        <form onSubmit={handleAdminLogin} className="space-y-6">
                            <div>
                                <label className="text-sm font-medium text-gray-700">Usuário</label>
                                <input type="email" value={adminUser} onChange={e => setAdminUser(e.target.value)} placeholder="admin@policardmed.com" required className="mt-1 w-full p-3 bg-gray-100 border border-gray-300 rounded-md"/>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700">Senha</label>
                                <input type="password" value={adminPass} onChange={e => setAdminPass(e.target.value)} placeholder="••••••••" required className="mt-1 w-full p-3 bg-gray-100 border border-gray-300 rounded-md"/>
                            </div>
                            <button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-5 rounded-md transition-all disabled:opacity-50">
                                {isLoading ? 'A entrar...' : 'Entrar'}
                            </button>
                        </form>
                    ) : (
                         <form onSubmit={handleAssociateLogin} className="space-y-6">
                             <div>
                                <label className="text-sm font-medium text-gray-700">CPF</label>
                                <input type="text" value={cpf} onChange={e => setCpf(e.target.value)} placeholder="Digite o seu CPF" required className="mt-1 w-full p-3 bg-gray-100 border border-gray-300 rounded-md"/>
                             </div>
                             <button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-5 rounded-md transition-all disabled:opacity-50">
                                 {isLoading ? 'A verificar...' : 'Aceder'}
                            </button>
                         </form>
                    )}
                </div>
                <p className="text-center text-gray-500 text-sm mt-6">&copy; {new Date().getFullYear()} Policardmed</p>
            </div>
        </div>
    );
};

// --- PAINEL DO ADMINISTRADOR ---
const AdminPanel = ({ onLogout }) => {
    // Estados
    const [adminView, setAdminView] = useState('dashboard'); // dashboard, associates, reports
    const [members, setMembers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [showEditMemberModal, setShowEditMemberModal] = useState(false);
    const [editingMember, setEditingMember] = useState(null);
    const [newMember, setNewMember] = useState({
        primaryMemberName: '', cpf: '', email: '', phone: '', address: '',
        planDetails: { type: 'consulta', name: 'Cartão Consulta', numberOfLives: 1 },
        dependents: [],
    });
    const [newDependentName, setNewDependentName] = useState('');
    const [newDependentRelationship, setNewDependentRelationship] = useState('');
    
    // --- Lógica de Dados ---
    useEffect(() => {
        if (!dbInstance) {
            setError("Banco de dados não inicializado.");
            setIsLoading(false);
            return;
        }
        const membersCollectionPath = `/artifacts/${appId}/public/data/policardmed_members`;
        const unsubscribe = onSnapshot(collection(dbInstance, membersCollectionPath), (snapshot) => {
            setMembers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setIsLoading(false);
        }, (err) => {
            setError("Falha ao carregar associados.");
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const dashboardStats = useCallback(() => {
        const now = new Date();
        let activeMembers = 0, newThisMonth = 0, expiringSoon = 0, totalLives = 0, defaulting = 0;
        const planDistribution = { consulta: 0, desconto_consulta: 0, desconto_completo: 0 };

        members.forEach(m => {
            const endDate = m.planEndDate?.toDate();
            if (m.isActive && endDate && endDate > now) {
                activeMembers++;
                totalLives += m.planDetails.numberOfLives || 1;
                if(m.planDetails.type) planDistribution[m.planDetails.type]++;
            }
            if(m.paymentStatus === 'em_debito') defaulting++;
            
            const startDate = m.planStartDate?.toDate();
            if (startDate?.getMonth() === now.getMonth() && startDate?.getFullYear() === now.getFullYear()) newThisMonth++;
            
            const thirtyDays = new Date();
            thirtyDays.setDate(now.getDate() + 30);
            if (m.isActive && endDate && endDate > now && endDate <= thirtyDays) expiringSoon++;
        });
        return { activeMembers, newThisMonth, expiringSoon, totalLives, defaulting, planDistribution };
    }, [members])();

    const handleAddMember = async (e) => {
        e.preventDefault();
        if (!dbInstance) { setError("Banco de dados não inicializado."); return; }
        if (!newMember.primaryMemberName || !newMember.cpf) { setError("Nome e CPF são obrigatórios."); return; }
        
        setError(null);
        const q = query(collection(dbInstance, `/artifacts/${appId}/public/data/policardmed_members`), where("cpf", "==", newMember.cpf));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) { setError("Já existe um associado com este CPF."); return; }

        const planStartDate = Timestamp.now();
        const planEndDate = new Timestamp(planStartDate.seconds + (365 * 24 * 60 * 60), planStartDate.nanoseconds);
        const memberData = { ...newMember, planStartDate, planEndDate, paymentStatus: 'em_dia', isActive: true, createdAt: Timestamp.now() };
        
        try {
            await addDoc(collection(dbInstance, `/artifacts/${appId}/public/data/policardmed_members`), memberData);
            setShowAddMemberModal(false);
            setNewMember({
                primaryMemberName: '', cpf: '', email: '', phone: '', address: '',
                planDetails: { type: 'consulta', name: 'Cartão Consulta', numberOfLives: 1 },
                dependents: [],
            });
        } catch (err) {
            setError("Erro ao salvar associado.");
            console.error(err);
        }
    };
    
    const handleUpdateMember = async (e) => {
        e.preventDefault();
        if (!editingMember || !dbInstance) {
            setError("Nenhum associado selecionado para edição ou banco de dados indisponível.");
            return;
        }

        const memberRef = doc(dbInstance, `/artifacts/${appId}/public/data/policardmed_members`, editingMember.id);
        
        try {
            // Remove o ID do objeto para não o salvar dentro do documento
            const { id, ...dataToUpdate } = editingMember;
            await updateDoc(memberRef, dataToUpdate);
            setShowEditMemberModal(false);
            setEditingMember(null);
        } catch (err) {
            setError("Erro ao atualizar associado.");
            console.error(err);
        }
    };
    
    const handleOpenEditModal = (member) => {
        setEditingMember(member);
        setShowEditMemberModal(true);
    }
    
    const getPlanName = (type) => {
        switch (type) {
            case 'consulta': return 'Cartão Consulta';
            case 'desconto_consulta': return 'Cartão Desconto - Só Consultas';
            case 'desconto_completo': return 'Cartão Desconto - Consultas e Exames';
            default: return 'Plano Desconhecido';
        }
    };
     const handleAddDependent = () => {
        if (newDependentName.trim() && newDependentRelationship.trim()) {
            const memberState = editingMember ? editingMember : newMember;
            const setMemberState = editingMember ? setEditingMember : setNewMember;

            setMemberState(prev => ({
                ...prev,
                dependents: [...(prev.dependents || []), { name: newDependentName, relationship: newDependentRelationship }]
            }));
            setNewDependentName('');
            setNewDependentRelationship('');
        }
    };
    const handleRemoveDependent = (index) => {
        const memberState = editingMember ? editingMember : newMember;
        const setMemberState = editingMember ? setEditingMember : setNewMember;
        setMemberState(prev => ({ ...prev, dependents: prev.dependents.filter((_, i) => i !== index) }));
    };

    const togglePaymentStatus = async (member) => {
        if (!dbInstance) return;
        const memberRef = doc(dbInstance, `/artifacts/${appId}/public/data/policardmed_members`, member.id);
        const newStatus = member.paymentStatus === 'em_dia' ? 'em_debito' : 'em_dia';
        try {
            await updateDoc(memberRef, { paymentStatus: newStatus });
        } catch (err) {
            setError("Erro ao alterar status de pagamento.");
        }
    };

    // Componente de Navegação do Admin
    const AdminNav = ({ current, onNavigate }) => (
         <div className="bg-white/70 backdrop-blur-sm p-3 rounded-xl mb-8 flex justify-center items-center gap-2 md:gap-4 shadow">
            <button onClick={() => onNavigate('dashboard')} className={`px-4 py-2 rounded-lg transition-colors font-medium text-sm md:text-base flex items-center gap-2 ${current === 'dashboard' ? 'bg-blue-600 text-white shadow-md' : 'bg-transparent text-gray-600 hover:bg-blue-100'}`}>
                <TrendingUp size={18}/> Dashboard
            </button>
            <button onClick={() => onNavigate('associates')} className={`px-4 py-2 rounded-lg transition-colors font-medium text-sm md:text-base flex items-center gap-2 ${current === 'associates' ? 'bg-blue-600 text-white shadow-md' : 'bg-transparent text-gray-600 hover:bg-blue-100'}`}>
                <Users size={18}/> Associados
            </button>
             <button onClick={() => onNavigate('reports')} className={`px-4 py-2 rounded-lg transition-colors font-medium text-sm md:text-base flex items-center gap-2 ${current === 'reports' ? 'bg-blue-600 text-white shadow-md' : 'bg-transparent text-gray-600 hover:bg-blue-100'}`}>
                <BarChart2 size={18}/> Relatórios
            </button>
        </div>
    );
    
    // --- Renderização ---
    return (
        <div className="min-h-screen bg-slate-100 text-gray-800 font-sans">
            <header className="bg-white shadow-sm p-4 flex justify-between items-center">
                 <div className="text-xl font-bold text-blue-600">Policardmed</div>
                 <button onClick={onLogout} className="flex items-center gap-2 text-sm text-gray-600 hover:text-red-600 font-medium">
                     Sair <LogOut size={16} />
                 </button>
            </header>
            <main className="p-4 md:p-8">
                 <div className="container mx-auto">
                    {error && <CustomAlertModal message={error} onClose={() => setError(null)} />}
                     <AdminNav current={adminView} onNavigate={setAdminView} />
                    {isLoading ? (
                        <div className="text-center py-10"><p>A carregar dados...</p></div>
                    ) : (
                        <div className="animate-fadeIn">
                            {adminView === 'dashboard' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <StatCard icon={<Users size={28}/>} title="Associados Ativos" value={dashboardStats.activeMembers} color="blue" />
                                    <StatCard icon={<Heart size={28}/>} title="Total de Vidas Cobertas" value={dashboardStats.totalLives} color="teal" />
                                    <StatCard icon={<TrendingUp size={28}/>} title="Novos no Mês" value={dashboardStats.newThisMonth} color="green" />
                                    <StatCard icon={<FileWarning size={28}/>} title="Inadimplentes" value={dashboardStats.defaulting} color="red" />
                                    
                                    <div className="md:col-span-2 lg:col-span-4 bg-white p-6 rounded-xl shadow-lg">
                                        <h3 className="font-semibold text-gray-700 mb-4">Associados por Plano</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <PlanStatCard title="Cartão Consulta" value={dashboardStats.planDistribution.consulta || 0} color="blue"/>
                                            <PlanStatCard title="Cartão Desconto (Consultas)" value={dashboardStats.planDistribution.desconto_consulta || 0} color="orange"/>
                                            <PlanStatCard title="Cartão Desconto (Consultas e Exames)" value={dashboardStats.planDistribution.desconto_completo || 0} color="purple"/>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {adminView === 'associates' && (
                                <div>
                                    <button onClick={() => setShowAddMemberModal(true)} className="mb-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md flex items-center transition-transform hover:scale-105">
                                        <UserPlus size={20} className="mr-2" /> Adicionar Novo Associado
                                    </button>
                                     <div className="bg-white shadow-xl rounded-lg p-4 sm:p-6 overflow-x-auto">
                                        <h3 className="text-2xl font-semibold mb-6 text-gray-700">Lista de Associados</h3>
                                         <table className="w-full text-left">
                                            <thead className="border-b-2 border-gray-200">
                                                <tr>
                                                    <th className="p-3 text-sm font-semibold text-gray-600">Nome</th><th className="p-3 text-sm font-semibold text-gray-600">CPF</th><th className="p-3 text-sm font-semibold text-gray-600">Plano</th><th className="p-3 text-sm font-semibold text-gray-600">Vencimento</th><th className="p-3 text-sm font-semibold text-gray-600">Pagamento</th><th className="p-3 text-sm font-semibold text-gray-600">Ações</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {members.map(member => (
                                                    <tr key={member.id} className="border-b border-gray-100 hover:bg-gray-50">
                                                        <td className="p-3 font-medium text-gray-800">{member.primaryMemberName}</td>
                                                        <td className="p-3 text-gray-600">{member.cpf}</td>
                                                        <td className="p-3 text-gray-600">{member.planDetails.name}</td>
                                                        <td className="p-3 text-gray-600">{member.planEndDate?.toDate().toLocaleDateString()}</td>
                                                        <td className="p-3">
                                                            <span onClick={() => togglePaymentStatus(member)} className={`cursor-pointer px-2 py-1 text-xs font-semibold rounded-full ${member.paymentStatus === 'em_dia' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                                {member.paymentStatus === 'em_dia' ? 'Em dia' : 'Em débito'}
                                                            </span>
                                                        </td>
                                                        <td className="p-3">
                                                            <button onClick={() => handleOpenEditModal(member)} className="text-blue-600 hover:text-blue-800"><Edit size={16}/></button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                            {adminView === 'reports' && <ReportsPage members={members} />}
                        </div>
                    )}
                     {showAddMemberModal && (
                        <Modal onClose={() => setShowAddMemberModal(false)} title="Adicionar Novo Associado">
                             <MemberForm 
                                memberData={newMember} 
                                setMemberData={setNewMember} 
                                onSubmit={handleAddMember} 
                                newDependentName={newDependentName}
                                setNewDependentName={setNewDependentName}
                                newDependentRelationship={newDependentRelationship}
                                setNewDependentRelationship={setNewDependentRelationship}
                                handleAddDependent={handleAddDependent}
                                handleRemoveDependent={handleRemoveDependent}
                                getPlanName={getPlanName}
                                buttonText="Salvar Associado"
                                onClose={() => setShowAddMemberModal(false)}
                             />
                        </Modal>
                    )}
                    {showEditMemberModal && editingMember && (
                         <Modal onClose={() => setShowEditMemberModal(false)} title="Editar Associado">
                            <MemberForm 
                                memberData={editingMember}
                                setMemberData={setEditingMember} 
                                onSubmit={handleUpdateMember} 
                                newDependentName={newDependentName}
                                setNewDependentName={setNewDependentName}
                                newDependentRelationship={newDependentRelationship}
                                setNewDependentRelationship={setNewDependentRelationship}
                                handleAddDependent={handleAddDependent}
                                handleRemoveDependent={handleRemoveDependent}
                                getPlanName={getPlanName}
                                buttonText="Atualizar Associado"
                                isEditing={true}
                                onClose={() => setShowEditMemberModal(false)}
                             />
                        </Modal>
                    )}
                 </div>
            </main>
        </div>
    );
};

// --- PAINEL DO ASSOCIADO ---
const AssociatePanel = ({ memberData, onLogout }) => {
     return (
        <div className="min-h-screen bg-slate-100 text-gray-800 font-sans">
             <header className="bg-white shadow-sm p-4 flex justify-between items-center">
                 <div className="text-xl font-bold text-blue-600">Policardmed</div>
                 <button onClick={onLogout} className="flex items-center gap-2 text-sm text-gray-600 hover:text-red-600 font-medium">
                     Sair <LogOut size={16} />
                 </button>
            </header>
            <main className="p-4 md:p-8">
                <div className="container mx-auto">
                     <div className="bg-white shadow-xl rounded-lg p-8 max-w-2xl mx-auto animate-fadeIn">
                        <h2 className="text-2xl font-bold text-center text-gray-700 mb-2">Bem-vindo(a), {memberData.primaryMemberName}!</h2>
                        <p className="text-gray-600 text-center mb-6">Este é o seu portal Policardmed.</p>
                         <div className="bg-gradient-to-br from-blue-600 to-teal-500 p-6 rounded-xl shadow-2xl text-white">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-2xl font-bold">Policardmed</h3>
                                <CreditCard size={32} />
                            </div>
                            <div className="mb-4">
                                <p className="text-sm opacity-80">Associado(a)</p>
                                <p className="text-xl font-semibold">{memberData.primaryMemberName}</p>
                            </div>
                            <div className="mb-4">
                                <p className="text-sm opacity-80">CPF</p>
                                <p className="text-lg">{memberData.cpf}</p>
                            </div>
                         </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

// --- Componentes Reutilizáveis e Auxiliares ---

// Formulário de Membro (para Adicionar e Editar)
const MemberForm = ({ memberData, setMemberData, onSubmit, newDependentName, setNewDependentName, newDependentRelationship, setNewDependentRelationship, handleAddDependent, handleRemoveDependent, getPlanName, buttonText, onClose, isEditing = false }) => {
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setMemberData(prev => ({ ...prev, [name]: value }));
    };

    const handlePlanChange = (e) => {
        const { name, value } = e.target;
        const newPlanDetails = { ...memberData.planDetails, [name]: value };
        if (name === 'type') {
            newPlanDetails.name = getPlanName(value);
        }
        if (name === 'numberOfLives') {
            newPlanDetails.numberOfLives = parseInt(value, 10) || 1;
        }
        setMemberData(prev => ({...prev, planDetails: newPlanDetails}));
    };

    return (
        <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Nome Completo*</label>
                    <input name="primaryMemberName" type="text" value={memberData.primaryMemberName} onChange={handleInputChange} required className="mt-1 block w-full p-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm"/>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">CPF*</label>
                    <input name="cpf" type="text" value={memberData.cpf} onChange={handleInputChange} required disabled={isEditing} className="mt-1 block w-full p-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm disabled:bg-gray-200"/>
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input name="email" type="email" value={memberData.email} onChange={handleInputChange} className="mt-1 block w-full p-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm"/>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Tipo de Plano*</label>
                    <select name="type" value={memberData.planDetails.type} onChange={handlePlanChange} required className="mt-1 block w-full p-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm">
                        <option value="consulta">Cartão Consulta</option>
                        <option value="desconto_consulta">Cartão Desconto - Só Consultas</option>
                        <option value="desconto_completo">Cartão Desconto - Consultas e Exames</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Número de Vidas*</label>
                    <input name="numberOfLives" type="number" min="1" max="6" value={memberData.planDetails.numberOfLives} onChange={handlePlanChange} required className="mt-1 block w-full p-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm"/>
                </div>
            </div>
            {isEditing && (
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Status do Pagamento*</label>
                    <select name="paymentStatus" value={memberData.paymentStatus} onChange={handleInputChange} required className="mt-1 block w-full p-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm">
                        <option value="em_dia">Em dia</option>
                        <option value="em_debito">Em débito</option>
                    </select>
                </div>
            )}
            <fieldset className="border border-gray-300 p-4 rounded-md">
                <legend className="text-sm font-medium text-gray-700 px-2">Dependentes</legend>
                {memberData.dependents?.map((dep, index) => (
                    <div key={index} className="flex items-center space-x-2 mb-2 bg-gray-100 p-2 rounded">
                        <p className="flex-grow text-sm text-gray-800">{dep.name} ({dep.relationship})</p>
                        <button type="button" onClick={() => handleRemoveDependent(index)} className="text-red-500 hover:text-red-700"><Trash2 size={16}/></button>
                    </div>
                ))}
                <div className="flex items-end space-x-2 mt-2">
                    <div className="flex-grow">
                        <input type="text" value={newDependentName} onChange={(e) => setNewDependentName(e.target.value)} placeholder="Nome do Dependente" className="w-full p-2 text-sm bg-gray-100 border-gray-300 rounded-md shadow-sm"/>
                    </div>
                    <div className="flex-grow">
                        <input type="text" value={newDependentRelationship} onChange={(e) => setNewDependentRelationship(e.target.value)} placeholder="Parentesco" className="w-full p-2 text-sm bg-gray-100 border-gray-300 rounded-md shadow-sm"/>
                    </div>
                    <button type="button" onClick={handleAddDependent} className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"><PlusCircle size={18}/></button>
                </div>
            </fieldset>
            <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md">Cancelar</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md">{buttonText}</button>
            </div>
        </form>
    );
};

const ReportsPage = ({ members }) => { /* ... (código igual à versão anterior) ... */ return <div>Relatórios</div>; };
const ReportTable = ({ headers, data, renderRow }) => { /* ... (código igual à versão anterior) ... */ return <table></table>; };
const CustomAlertModal = ({ message, onClose }) => { /* ... (código igual à versão anterior) ... */ return <div>{message}</div>; };
const StatCard = ({ icon, title, value, color }) => { /* ... (código igual à versão anterior) ... */ return <div>{title}: {value}</div>; };
const PlanStatCard = ({ title, value, color }) => { /* ... (código igual à versão anterior) ... */ return <div>{title}: {value}</div>; };
const Modal = ({ children, onClose, title }) => {
    useEffect(() => {
        const handleEsc = (event) => { if (event.keyCode === 27) onClose(); };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center p-4 z-50 animate-fadeIn" onClick={onClose}>
            <div className="bg-white text-gray-800 p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-semibold text-gray-700">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><XCircle size={24} /></button>
                </div>
                {children}
            </div>
        </div>
    );
};

// --- CSS para Animações ---
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fadeIn {
    animation: fadeIn 0.5s ease-out forwards;
  }
`;
document.head.appendChild(styleSheet);


export default PolicardmedApp;
